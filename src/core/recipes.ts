import { promises as dns } from "node:dns";
import type { AnswerCard, AskContext } from "./ask.js";
import { askNetwork, guard } from "./ask.js";

/**
 * Recipes combine several intents into one answer (ARCHITECTURE A8). Each sub-question
 * is a separate routed, paid, receipted call; Morse only combines, miners decide.
 */
export interface Recipe {
  name: string;
  usage: string;
  description: string;
  /** Returns the sub-questions, or an error message for bad input. */
  plan(input: string): Promise<{ questions: string[]; subject: string } | { error: string }>;
  /** One-line combined verdict from the receipts that succeeded. */
  verdict(cards: AnswerCard[]): string;
}

export interface RecipeResult {
  recipe: string;
  subject: string;
  cards: AnswerCard[];
  verdict: string;
  error: string | null;
}

export type Asker = (ctx: AskContext, question: string, kind: string, skipGuard: boolean) => Promise<AnswerCard>;

const RED_FLAGS = /\b(malicious|phishing|scam|unsafe|dangerous|suspicious|expired|invalid|revoked|mismatch|high risk|fraud)/i;

function hostOf(input: string): string | null {
  const s = input.trim();
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export const safe: Recipe = {
  name: "safe",
  usage: "/safe <url>",
  description: "URL_SCAN + SSL_VERIFICATION + IP_GEOLOCATION of the host, combined into one verdict.",
  async plan(input) {
    const host = hostOf(input);
    if (!host || !host.includes(".")) return { error: "Give me a URL or a hostname, e.g. /safe https://example.com" };
    const url = /^[a-z]+:\/\//i.test(input.trim()) ? input.trim() : `https://${host}`;
    const questions = [
      `Is the URL ${url} safe to visit? Check it for phishing, malware and scams.`,
      `Is the SSL/TLS certificate for ${host} currently valid, and who issued it?`,
    ];
    try {
      const { address } = await dns.lookup(host);
      questions.push(`Where is the IP address ${address} located, and which organisation operates it?`);
    } catch {
      /* host does not resolve: two questions are still a real check */
    }
    return { questions, subject: url };
  },
  verdict(cards) {
    const ok = cards.filter((c) => c.ok && c.receipt);
    if (ok.length === 0) return "No miner could assess this right now.";
    const flagged = ok.filter((c) => RED_FLAGS.test(`${c.receipt?.label ?? ""} ${c.receipt?.answer ?? ""}`));
    if (flagged.length > 0) {
      return `Caution: ${flagged.length} of ${ok.length} checks raised a red flag (${flagged.map((c) => c.receipt?.intent ?? "?").join(", ")}).`;
    }
    return `No red flags from ${ok.length} independent checks (${ok.map((c) => c.receipt?.intent ?? "?").join(", ")}).`;
  },
};

export const wallet: Recipe = {
  name: "wallet",
  usage: "/wallet <0xaddress or name.eth>",
  description: "WALLET_BALANCE_CHECK + FRAUD_DETECTION for one address.",
  async plan(input) {
    const a = input.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(a) && !/^[a-z0-9-]+\.eth$/i.test(a)) {
      return { error: "Give me an EVM address or an ENS name, e.g. /wallet vitalik.eth" };
    }
    return {
      subject: a,
      questions: [
        `What is the current ETH balance of ${a} on Base?`,
        `How likely is the wallet ${a} to be involved in fraud, scams or illicit activity? Give a risk assessment.`,
      ],
    };
  },
  verdict(cards) {
    const ok = cards.filter((c) => c.ok && c.receipt);
    if (ok.length === 0) return "No miner could assess this wallet right now.";
    const risk = ok.find((c) => c.receipt?.intent === "FRAUD_DETECTION");
    const flagged = risk && RED_FLAGS.test(`${risk.receipt?.label ?? ""} ${risk.receipt?.answer ?? ""}`);
    return flagged ? "Caution: the fraud check raised a red flag." : `${ok.length} checks completed; no fraud red flag reported.`;
  },
};

export const weather: Recipe = {
  name: "weather",
  usage: "/weather <place>",
  description: "WEATHER_CHECK + STORM_ALERT for one place.",
  async plan(input) {
    const p = input.trim();
    if (p.length < 2) return { error: "Give me a place, e.g. /weather Chennai" };
    return {
      subject: p,
      questions: [
        `What is the current weather in ${p}?`,
        `Is there a storm or severe weather risk in ${p} over the next 48 hours? Report wind, gusts, precipitation and an overall risk between 0 and 1.`,
      ],
    };
  },
  verdict(cards) {
    const ok = cards.filter((c) => c.ok && c.receipt);
    if (ok.length === 0) return "No weather miner answered right now.";
    const storm = ok.find((c) => c.receipt?.intent === "STORM_ALERT");
    return storm ? "Current conditions and a 48-hour storm outlook, from two independent intents." : "Current conditions reported; the storm outlook did not come back.";
  },
};

export const fact: Recipe = {
  name: "fact",
  usage: "/fact <claim>",
  description: "FACT_CHECK + NEWS_SEARCH for one claim.",
  async plan(input) {
    const c = input.trim();
    if (c.length < 8) return { error: "Give me a claim to check, e.g. /fact The Eiffel Tower is in Berlin" };
    return {
      subject: c,
      questions: [`Is this claim true or false: "${c}"? Give the evidence.`, `What is the latest news relevant to: ${c}`],
    };
  },
  verdict(cards) {
    const ok = cards.filter((c) => c.ok && c.receipt);
    if (ok.length === 0) return "No miner could check this right now.";
    const fc = ok.find((c) => c.receipt?.intent === "FACT_CHECK");
    return fc?.receipt?.label ? `Fact check verdict: ${fc.receipt.label}.` : `${ok.length} sources consulted; read the receipts below.`;
  },
};

export const RECIPES: Record<string, Recipe> = { safe, wallet, weather, fact };

export async function runRecipe(
  ctx: AskContext,
  recipe: Recipe,
  input: string,
  asker: Asker = askNetwork,
): Promise<RecipeResult> {
  const plan = await recipe.plan(input);
  if ("error" in plan) return { recipe: recipe.name, subject: input, cards: [], verdict: "", error: plan.error };
  const g = await guard(ctx, plan.questions.length);
  if (!g.allowed) return { recipe: recipe.name, subject: plan.subject, cards: [], verdict: "", error: g.reason ?? "Not allowed." };
  const cards = await Promise.all(plan.questions.map((q) => asker(ctx, q, recipe.name, true)));
  return { recipe: recipe.name, subject: plan.subject, cards, verdict: recipe.verdict(cards), error: null };
}
