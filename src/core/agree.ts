/**
 * Agreement between miners' answers to the same question — the honest part of
 * Ask the Podium. Two answers can be compared only when both carry something
 * machine-comparable: a verdict for verdict-shaped intents, or a number for
 * number-shaped ones. Everything else is reported as "not automatically
 * comparable", never guessed (rule 01: no fake agreement).
 */
export interface Comparable {
  minerSlug: string | null;
  minerRank: number | null;
  label: string | null;
  answer: string | null;
}

export type Polarity = "positive" | "negative";

interface VerdictVocab {
  /** What "positive" means for this intent, shown to people. */
  positive: string;
  negative: string;
  /** Negative cues are tested first because they often contain the positive word ("not valid"). */
  neg: RegExp;
  pos: RegExp;
}

const VERDICT_INTENTS: Record<string, VerdictVocab> = {
  SSL_VERIFICATION: {
    positive: "valid",
    negative: "not valid",
    neg: /\b(not valid|invalid|expired|self[- ]signed|untrusted|mismatch|revoked|no certificate|failed|error)\b/i,
    pos: /\b(valid|trusted|ok|good|verified)\b/i,
  },
  URL_SCAN: {
    positive: "safe",
    negative: "unsafe",
    neg: /\b(not safe|unsafe|malicious|phishing|malware|dangerous|suspicious|high[- ]risk|blocked|flagged)\b/i,
    pos: /\b(safe|clean|benign|no threats?|not malicious|low[- ]risk|harmless|legitimate)\b/i,
  },
  FRAUD_DETECTION: {
    positive: "low risk",
    negative: "high risk",
    neg: /\b(fraud(ulent)?|scam|high[- ]risk|illicit|flagged|sanction|launder|suspicious)\b/i,
    pos: /\b(low[- ]risk|not fraudulent|no (fraud|risk)|legitimate|clean|minimal risk)\b/i,
  },
  FACT_CHECK: {
    positive: "true",
    negative: "false",
    neg: /\b(false|incorrect|not true|untrue|misleading|debunked|inaccurate|myth)\b/i,
    pos: /\b(true|correct|accurate|verified|confirmed|supported)\b/i,
  },
  AI_TEXT_DETECTION: {
    positive: "human-written",
    negative: "AI-generated",
    neg: /\b(ai[- ]?(generated|written)|written by (an )?ai|machine[- ]generated|synthetic|likely ai|\bai\b)\b/i,
    pos: /\b(human[- ]?(written|authored)?|likely human|written by a human)\b/i,
  },
};

interface NumberSpec {
  /** Regexes tried in order; the first capture group is the number. */
  patterns: RegExp[];
  /** Relative tolerance (0.02 = 2%) or absolute when `absolute` is set. */
  tolerance: number;
  absolute?: boolean;
  unit: string;
}

const NUM = String.raw`(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?)`;

const NUMBER_INTENTS: Record<string, NumberSpec> = {
  CRYPTO_PRICE: { patterns: [new RegExp(`\\$\\s*${NUM}`), new RegExp(`${NUM}\\s*(?:usd|dollars)`, "i"), new RegExp(`(?:price|trading|worth|at)\\D{0,20}${NUM}`, "i")], tolerance: 0.02, unit: "USD" },
  STOCK_PRICE: { patterns: [new RegExp(`\\$\\s*${NUM}`), new RegExp(`${NUM}\\s*(?:usd|dollars)`, "i"), new RegExp(`(?:price|trading|closed|at)\\D{0,20}${NUM}`, "i")], tolerance: 0.02, unit: "USD" },
  CURRENCY_EXCHANGE: { patterns: [new RegExp(`(?:=|equals|rate (?:is|of))\\s*${NUM}`, "i"), new RegExp(`${NUM}\\s*(?:inr|eur|usd|gbp|jpy)`, "i"), new RegExp(NUM)], tolerance: 0.01, unit: "" },
  GAS_PRICE: { patterns: [new RegExp(`${NUM}\\s*gwei`, "i"), new RegExp(NUM)], tolerance: 0.3, unit: "gwei" },
  WALLET_BALANCE_CHECK: { patterns: [new RegExp(`${NUM}\\s*(?:eth|ether)\\b`, "i"), new RegExp(`(?:balance|holds|has)\\D{0,30}${NUM}`, "i")], tolerance: 0.005, unit: "ETH" },
  TOKEN_HOLDER_COUNT: { patterns: [new RegExp(`${NUM}\\s*(?:holders|addresses)`, "i"), new RegExp(`(?:holders?|held by)\\D{0,20}${NUM}`, "i")], tolerance: 0.05, unit: "holders" },
  TVL_LOOKUP: { patterns: [new RegExp(`\\$\\s*${NUM}\\s*([bmk])?`, "i"), new RegExp(`${NUM}\\s*(billion|million)`, "i")], tolerance: 0.05, unit: "USD" },
  WEATHER_CHECK: { patterns: [new RegExp(`${NUM}\\s*°\\s*c\\b`, "i"), new RegExp(`${NUM}\\s*(?:degrees?\\s*)?(?:celsius|c)\\b`, "i"), new RegExp(`${NUM}\\s*°`)], tolerance: 2, absolute: true, unit: "°C" },
};

/** Which comparison Podium can attempt for an intent, if any. */
export function comparisonKind(intent: string | null): "verdict" | "number" | "none" {
  if (!intent) return "none";
  if (VERDICT_INTENTS[intent]) return "verdict";
  if (NUMBER_INTENTS[intent]) return "number";
  return "none";
}

export function polarityOf(intent: string, c: Comparable): Polarity | null {
  const v = VERDICT_INTENTS[intent];
  if (!v) return null;
  // A declared label is the miner's own verdict and beats prose. Only the answer's
  // opening is read otherwise, where miners state the verdict before the details.
  const sources = [c.label, c.answer ? c.answer.slice(0, 320) : null].filter((s): s is string => Boolean(s && s.trim()));
  for (const s of sources) {
    if (v.neg.test(s)) return "negative";
    if (v.pos.test(s)) return "positive";
  }
  return null;
}

function parseNumber(raw: string, suffix?: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const s = (suffix ?? "").toLowerCase();
  if (s.startsWith("b")) return n * 1e9;
  if (s.startsWith("m")) return n * 1e6;
  if (s.startsWith("k")) return n * 1e3;
  return n;
}

export function numberOf(intent: string, c: Comparable): number | null {
  const spec = NUMBER_INTENTS[intent];
  if (!spec) return null;
  const sources = [c.label, c.answer].filter((s): s is string => Boolean(s && s.trim()));
  for (const s of sources) {
    for (const re of spec.patterns) {
      const m = re.exec(s);
      if (m?.[1]) {
        const n = parseNumber(m[1], m[2]);
        if (n !== null) return n;
      }
    }
  }
  return null;
}

export interface AgreementValue {
  minerSlug: string | null;
  minerRank: number | null;
  /** What was compared, rendered for people; null when nothing comparable was found. */
  value: string | null;
  polarity?: Polarity | null;
  number?: number | null;
}

export interface Agreement {
  kind: "verdict" | "number" | "none";
  /** agree / disagree only when at least two answers were comparable. */
  verdict: "agree" | "disagree" | "undetermined";
  comparable: number;
  total: number;
  /** One sentence a judge can read without the table. */
  summary: string;
  values: AgreementValue[];
}

function fmt(n: number, unit: string): string {
  const s = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : Number(n.toPrecision(6)).toString();
  return unit ? `${s} ${unit}`.trim() : s;
}

/** Compare the answers of one podium round. Never returns "agree" for a single answer. */
export function agreement(intent: string | null, answers: Comparable[]): Agreement {
  const kind = comparisonKind(intent);
  const total = answers.length;
  if (kind === "none" || !intent) {
    return {
      kind: "none",
      verdict: "undetermined",
      comparable: 0,
      total,
      summary: `Answers for ${intent ?? "this intent"} are free text, so agreement is not judged automatically — read them side by side.`,
      values: answers.map((a) => ({ minerSlug: a.minerSlug, minerRank: a.minerRank, value: null })),
    };
  }

  if (kind === "verdict") {
    const v = VERDICT_INTENTS[intent]!;
    const values: AgreementValue[] = answers.map((a) => {
      const p = polarityOf(intent, a);
      return { minerSlug: a.minerSlug, minerRank: a.minerRank, polarity: p, value: p ? (p === "positive" ? v.positive : v.negative) : null };
    });
    const known = values.filter((x) => x.polarity);
    if (known.length < 2) {
      return { kind, verdict: "undetermined", comparable: known.length, total, summary: `Only ${known.length} of ${total} answers stated a clear verdict, so agreement cannot be judged.`, values };
    }
    const positives = known.filter((x) => x.polarity === "positive").length;
    const negatives = known.length - positives;
    const unclear = total - known.length;
    if (positives === known.length || negatives === known.length) {
      const word = positives === known.length ? v.positive : v.negative;
      return { kind, verdict: "agree", comparable: known.length, total, summary: `${known.length} of ${total} miners agree: ${word}.${unclear ? ` ${unclear} gave no clear verdict.` : ""}`, values };
    }
    const who = (p: Polarity) => known.filter((x) => x.polarity === p).map((x) => `${x.minerSlug ?? "?"}${x.minerRank ? ` (#${x.minerRank})` : ""}`).join(", ");
    return { kind, verdict: "disagree", comparable: known.length, total, summary: `Disagreement: ${who("positive")} say ${v.positive}; ${who("negative")} say ${v.negative}.`, values };
  }

  const spec = NUMBER_INTENTS[intent]!;
  const values: AgreementValue[] = answers.map((a) => {
    const n = numberOf(intent, a);
    return { minerSlug: a.minerSlug, minerRank: a.minerRank, number: n, value: n === null ? null : fmt(n, spec.unit) };
  });
  const known = values.filter((x) => typeof x.number === "number");
  if (known.length < 2) {
    return { kind, verdict: "undetermined", comparable: known.length, total, summary: `Only ${known.length} of ${total} answers contained a comparable figure, so agreement cannot be judged.`, values };
  }
  const nums = known.map((x) => x.number as number);
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const spread = spec.absolute ? hi - lo : lo === 0 ? (hi === 0 ? 0 : Infinity) : (hi - lo) / Math.abs(lo);
  const within = spread <= spec.tolerance;
  const tol = spec.absolute ? `${spec.tolerance} ${spec.unit}` : `${(spec.tolerance * 100).toFixed(0)}%`;
  const range = lo === hi ? fmt(lo, spec.unit) : `${fmt(lo, spec.unit)} to ${fmt(hi, spec.unit)}`;
  return {
    kind,
    verdict: within ? "agree" : "disagree",
    comparable: known.length,
    total,
    summary: within
      ? `${known.length} of ${total} miners agree within ${tol}: ${range}.`
      : `Disagreement: the figures span ${range}, outside the ${tol} tolerance.`,
    values,
  };
}
