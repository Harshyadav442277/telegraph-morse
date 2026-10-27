/**
 * Turns the Engine's raw response into the receipt every Morse answer carries
 * (ARCHITECTURE A3, A4). Miners do not share a result schema, so confidence, label
 * and reason are read from the paths each miner declares in its `signal_mapping`,
 * with defensive fallbacks for the common shapes seen in the live catalogue.
 */

export interface SignalMapping {
  confidence_field?: string | null;
  label_field?: string | null;
  reason_field?: string | null;
}

export interface EngineAsk {
  miner_id?: string | number;
  miner_name?: string;
  endpoint?: string;
  result?: unknown;
  cost_usd?: number;
  duration_ms?: number;
  timestamp?: string;
  reasoning?: string;
  intent?: string;
  signal_hash?: string;
  warnings?: string[];
  /** Filled from the node's payment-response header, not from its JSON body. */
  settlement?: { success: boolean; txHash: string | null; payer: string | null; errorReason: string | null } | null;
}

export interface Receipt {
  minerSlug: string | null;
  minerId: string | null;
  intent: string | null;
  /** Leaderboard rank of the serving miner for this intent, when known. */
  minerRank: number | null;
  confidence: number | null;
  /**
   * True when the miner's declared `confidence_field` is really a risk metric, so a
   * high number means more danger, not more certainty. Three active miners do this
   * (GAPS G8). Never render such a value as "confidence".
   */
  confidenceIsRisk: boolean;
  label: string | null;
  /** Human-readable answer text extracted from the miner's result. */
  answer: string;
  /** The miner's own reason it could not answer; the call was still paid. */
  refusal: string | null;
  costUsd: number | null;
  durationMs: number | null;
  signalHash: string | null;
  /** On-chain USDC settlement for this call, from the payment-response header. */
  settlementTx: string | null;
  routerReasoning: string | null;
  warnings: string[];
  raw: unknown;
}

export function getPath(obj: unknown, path: string | null | undefined): unknown {
  if (!path || obj === null || obj === undefined) return undefined;
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Field names that mean "how bad", not "how sure". Observed live on 2026-09-02:
 * amanat-weather-risk and skywire-storm-alert declare `risk`, elcaro-ipi-detection
 * declares `risk_score`.
 */
const RISK_FIELD = /(^|[._])(risk|danger|threat|severity|exploit_probability)/i;

export function isRiskField(field: string | null | undefined): boolean {
  return Boolean(field && RISK_FIELD.test(field));
}

/** Normalises 0-1, 0-100 and string confidences; anything else is "not reported". */
export function toConfidence(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return Number(n.toFixed(4));
  if (n > 1 && n <= 100) return Number((n / 100).toFixed(4));
  return null;
}

const TEXT_CANDIDATES = [
  "answer", "signal", "reason", "reasoning", "summary", "text", "message", "content", "response",
  "response_text", "translation", "translated_text", "description", "result", "verdict", "status", "output",
];

/**
 * Keys that say where or how an answer came, never what it is. A miner's declared
 * `reason_field` cannot be trusted to avoid them: chainsight-oracle declares `source`
 * and Morse showed "tls", "coingecko" and "rpc" as answers; bittensor-sn32-itsai
 * declares `status` and Morse showed "success" (12 of 175 answered asks, Sep 7 – Oct 27).
 */
const META_KEYS = new Set(["status", "source", "provider", "type", "kind"]);

const isProse = (s: string) => /\S\s+\S/.test(s);

/** Verdicts that mean the miner did not do the job, not that it judged the subject. */
const REFUSED_VERDICT = /^(rejected|error|invalid[_ ]?input|bad[_ ]?request)$/i;

/**
 * The miner's own statement that it could not answer, or null. On 2026-10-27
 * telegraph-verity-intelligence answered "Is the SSL certificate for github.com valid?"
 * with verdict "rejected", confidence 1 and `uncertainty: [{ message: "A hostname is
 * required." }]`, and Morse showed "rejected" at 100% confidence.
 */
export function minerRefusal(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const err = typeof r.error === "string" ? r.error : getPath(r, "error.message");
  if (typeof err === "string" && err.trim()) {
    // livecert sends `error: "invalid_cve_id"` with the explanation in `reason`.
    const why = [r.reason, r.message, r.detail].find((v): v is string => typeof v === "string" && isProse(v));
    return isProse(err) || !why ? err.trim() : why.trim();
  }
  const notes = Array.isArray(r.uncertainty)
    ? r.uncertainty.map((u) => getPath(u, "message")).filter((m): m is string => typeof m === "string" && m.trim() !== "")
    : [];
  if (typeof r.verdict === "string" && REFUSED_VERDICT.test(r.verdict) && notes.length > 0) return notes.join(" ");
  return null;
}

/**
 * Best-effort answer text. Never returns an empty string. A sentence anywhere beats a
 * single word in the declared field, and a bare source or status word is never the answer.
 */
export function extractAnswer(result: unknown, mapping?: SignalMapping | null): string {
  if (result === null || result === undefined) return "The miner returned an empty result.";
  if (typeof result === "string") return result.trim() || "The miner returned an empty result.";
  if (typeof result !== "object") return String(result);
  const r = result as Record<string, unknown>;

  const refusal = minerRefusal(r);
  if (refusal) return `The miner could not answer: ${refusal}`;

  const found: Array<[key: string, text: string]> = [];
  const add = (key: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) found.push([key, v.trim()]);
  };
  if (mapping?.reason_field) add(mapping.reason_field.split(".").pop()!, getPath(r, mapping.reason_field));
  // OpenAI-style chat completion
  add("content", getPath(r, "choices.0.message.content"));
  for (const key of TEXT_CANDIDATES) add(key, r[key]);
  // One level down: { data: { answer } }, { result: { reason } }
  for (const outer of ["data", "result", "output"]) {
    const inner = r[outer];
    if (inner && typeof inner === "object") {
      for (const key of TEXT_CANDIDATES) add(key, (inner as Record<string, unknown>)[key]);
    }
  }
  const pick = found.find(([, v]) => isProse(v)) ?? found.find(([k]) => !META_KEYS.has(k));
  if (pick) return pick[1];
  const json = JSON.stringify(result);
  return json.length > 600 ? `${json.slice(0, 600)}…` : json;
}

export function buildReceipt(
  ask: EngineAsk,
  mapping?: SignalMapping | null,
  minerRank: number | null = null,
): Receipt {
  const r = ask.result;
  const refusal = minerRefusal(r);
  const mapped = toConfidence(getPath(r, mapping?.confidence_field));
  // A few miners map a risk/severity score into confidence_field. Reading that as
  // confidence inverts its meaning, so it is kept but labelled for what it is.
  const confidenceIsRisk = mapped !== null && isRiskField(mapping?.confidence_field);
  const confidence =
    mapped ??
    toConfidence(getPath(r, "confidence")) ??
    toConfidence(getPath(r, "confidence_score")) ??
    toConfidence(getPath(r, "score"));
  const labelRaw = getPath(r, mapping?.label_field) ?? getPath(r, "verdict") ?? getPath(r, "label");
  return {
    minerSlug: ask.miner_name ?? null,
    minerId: ask.miner_id !== undefined ? String(ask.miner_id) : null,
    intent: ask.intent ?? null,
    minerRank,
    // A refusal at "confidence 1" is sure only that it did nothing.
    confidence: refusal ? null : confidence,
    confidenceIsRisk,
    label: typeof labelRaw === "string" || typeof labelRaw === "number" ? String(labelRaw) : null,
    answer: extractAnswer(r, mapping),
    refusal,
    costUsd: typeof ask.cost_usd === "number" ? ask.cost_usd : null,
    durationMs: typeof ask.duration_ms === "number" ? ask.duration_ms : null,
    signalHash: ask.signal_hash ?? null,
    settlementTx: ask.settlement?.txHash ?? null,
    routerReasoning: ask.reasoning ?? null,
    warnings: Array.isArray(ask.warnings) ? ask.warnings.filter((w) => typeof w === "string") : [],
    raw: r ?? null,
  };
}
