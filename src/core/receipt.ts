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
}

export interface Receipt {
  minerSlug: string | null;
  minerId: string | null;
  intent: string | null;
  /** Leaderboard rank of the serving miner for this intent, when known. */
  minerRank: number | null;
  confidence: number | null;
  label: string | null;
  /** Human-readable answer text extracted from the miner's result. */
  answer: string;
  costUsd: number | null;
  durationMs: number | null;
  signalHash: string | null;
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

/** Normalises 0-1, 0-100 and string confidences; anything else is "not reported". */
export function toConfidence(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return Number(n.toFixed(4));
  if (n > 1 && n <= 100) return Number((n / 100).toFixed(4));
  return null;
}

const TEXT_CANDIDATES = [
  "answer", "reason", "reasoning", "summary", "text", "message", "content", "response",
  "response_text", "translation", "translated_text", "result", "verdict", "status", "output",
];

/** Best-effort answer text. Never returns an empty string. */
export function extractAnswer(result: unknown, mapping?: SignalMapping | null): string {
  if (result === null || result === undefined) return "The miner returned an empty result.";
  if (typeof result === "string") return result.trim() || "The miner returned an empty result.";
  if (typeof result !== "object") return String(result);
  const r = result as Record<string, unknown>;

  const mapped = getPath(r, mapping?.reason_field);
  if (typeof mapped === "string" && mapped.trim()) return mapped.trim();

  // OpenAI-style chat completion
  const choice = getPath(r, "choices.0.message.content");
  if (typeof choice === "string" && choice.trim()) return choice.trim();

  for (const key of TEXT_CANDIDATES) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  // One level down: { data: { answer } }, { result: { reason } }
  for (const outer of ["data", "result", "output"]) {
    const inner = r[outer];
    if (inner && typeof inner === "object") {
      for (const key of TEXT_CANDIDATES) {
        const v = (inner as Record<string, unknown>)[key];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
  }
  const json = JSON.stringify(result);
  return json.length > 600 ? `${json.slice(0, 600)}…` : json;
}

export function buildReceipt(
  ask: EngineAsk,
  mapping?: SignalMapping | null,
  minerRank: number | null = null,
): Receipt {
  const r = ask.result;
  const confidence =
    toConfidence(getPath(r, mapping?.confidence_field)) ??
    toConfidence(getPath(r, "confidence")) ??
    toConfidence(getPath(r, "confidence_score")) ??
    toConfidence(getPath(r, "score"));
  const labelRaw = getPath(r, mapping?.label_field) ?? getPath(r, "verdict") ?? getPath(r, "label");
  return {
    minerSlug: ask.miner_name ?? null,
    minerId: ask.miner_id !== undefined ? String(ask.miner_id) : null,
    intent: ask.intent ?? null,
    minerRank,
    confidence,
    label: typeof labelRaw === "string" || typeof labelRaw === "number" ? String(labelRaw) : null,
    answer: extractAnswer(r, mapping),
    costUsd: typeof ask.cost_usd === "number" ? ask.cost_usd : null,
    durationMs: typeof ask.duration_ms === "number" ? ask.duration_ms : null,
    signalHash: ask.signal_hash ?? null,
    routerReasoning: ask.reasoning ?? null,
    warnings: Array.isArray(ask.warnings) ? ask.warnings.filter((w) => typeof w === "string") : [],
    raw: r ?? null,
  };
}
