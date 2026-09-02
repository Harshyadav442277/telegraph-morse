import type { Miner } from "./telegraph.js";
import { getIntents, leaderboard } from "./telegraph.js";

/**
 * Morse's own router.
 *
 * Telegraph's `/engine/v1/ask` classifies and routes for you, but on 2026-09-02 it
 * became unusable: the node's settlement call to `facilitator.payai.network` times
 * out after ~47s, longer than Vercel's 60s function ceiling leaves room for, while
 * `/engine/v1/ask/{minerId}` settles in ~3.6s (GAPS G17). So Morse picks the intent
 * and the miner itself and calls the miner directly.
 *
 * That is a downgrade in one way and an upgrade in another: the classification is
 * ours rather than the network's, so it is dumber — but it is inspectable, and the
 * receipt now says exactly why a question went where it went.
 */

/**
 * Keyword rules over the canonical intent set. Ordered: the first match wins, so the
 * specific rules sit above the general ones. Anything unmatched goes to a
 * general-purpose intent rather than being forced into a bad fit.
 */
const RULES: Array<{ intent: string; re: RegExp }> = [
  { intent: "SSL_VERIFICATION", re: /\b(ssl|tls|certificate|cert|https)\b/i },
  { intent: "URL_SCAN", re: /\b(safe to visit|phishing|malware|scan (this )?(url|site|link)|is .* safe)\b/i },
  { intent: "IP_GEOLOCATION", re: /\b(where is .*\bip\b|geolocat|which country .*\bip\b|\bip\b .*(located|location))/i },
  { intent: "CVE_LOOKUP", re: /\b(cve-\d{4}-\d+|vulnerability|exploit)\b/i },
  { intent: "STORM_ALERT", re: /\b(storm|hurricane|cyclone|typhoon|severe weather|gale)\b/i },
  { intent: "WEATHER_FORECAST", re: /\b(forecast|will it rain|tomorrow'?s weather|next \d+ days)\b/i },
  { intent: "WEATHER_CHECK", re: /\b(weather|temperature|humidity|raining|how hot|how cold)\b/i },
  { intent: "CRYPTO_PRICE", re: /\b(price of (btc|eth|sol|bitcoin|ethereum|solana)|crypto price|\b(btc|eth|sol)\b.*price|price.*\b(btc|eth|sol)\b)/i },
  { intent: "GAS_PRICE", re: /\b(gas (price|fee)|gwei)\b/i },
  { intent: "TVL_LOOKUP", re: /\b(tvl|total value locked)\b/i },
  { intent: "TOKEN_HOLDER_COUNT", re: /\b(holders?|holder count)\b/i },
  { intent: "ONCHAIN_TX_LOOKUP", re: /\b0x[0-9a-fA-F]{64}\b|\btransaction (hash|lookup)\b/i },
  { intent: "WALLET_BALANCE_CHECK", re: /\b(balance of|wallet balance|how much .*(hold|own)|\b0x[0-9a-fA-F]{40}\b|\b[a-z0-9-]+\.eth\b)/i },
  { intent: "FRAUD_DETECTION", re: /\b(fraud|scam|rug ?pull|illicit|launder|risk (score|assessment))\b/i },
  { intent: "STOCK_PRICE", re: /\b(stock|share price|nasdaq|nyse|ticker)\b/i },
  { intent: "CURRENCY_EXCHANGE", re: /\b(exchange rate|convert \d+ .*to|usd to|eur to|inr to)\b/i },
  { intent: "FINANCIAL_DATA", re: /\b(revenue|earnings|market cap|balance sheet)\b/i },
  { intent: "SPORTS_SCORE", re: /\b(score|match result|who won|final score)\b/i },
  { intent: "GAME_RESULT", re: /\b(game result|fixture)\b/i },
  { intent: "FACT_CHECK", re: /\b(is it true|fact.?check|debunk|true or false|verify (the )?claim)\b/i },
  { intent: "NEWS_HEADLINES", re: /\b(headlines|top news)\b/i },
  { intent: "NEWS_SEARCH", re: /\b(news about|latest news|recent news)\b/i },
  { intent: "ACADEMIC_SEARCH", re: /\b(paper|papers|arxiv|journal|study on|academic)\b/i },
  { intent: "LANGUAGE_TRANSLATION", re: /\b(translate|in (spanish|french|german|hindi|japanese|chinese|arabic))\b/i },
  { intent: "SENTIMENT_ANALYSIS", re: /\b(sentiment|how do people feel)\b/i },
  { intent: "CONTENT_MODERATION", re: /\b(moderate|is this offensive|toxic)\b/i },
  { intent: "AI_TEXT_DETECTION", re: /\b(ai.?(written|generated)|written by (an )?ai|chatgpt wrote)\b/i },
  { intent: "RESEARCH_SYNTHESIS", re: /\b(summari[sz]e (the )?(research|literature)|synthesi[sz]e)\b/i },
  { intent: "WEB_SEARCH", re: /\b(search (the )?web|look up online)\b/i },
];

/** Tried in order when no rule matches; the first with a live miner wins. */
const FALLBACKS = ["CHAT_COMPLETION", "WEB_SEARCH", "RESEARCH_QUERY", "TASK_COMPLETION", "LANGUAGE_GENERATION"];

export interface Route {
  intent: string;
  miner: Miner;
  rank: number | null;
  /** Why this intent was chosen — shown on the receipt, never hidden. */
  why: string;
}

export function classifyIntent(question: string): { intent: string; why: string } | null {
  for (const r of RULES) {
    if (r.re.test(question)) return { intent: r.intent, why: `matched the ${r.intent} rule` };
  }
  return null;
}

/**
 * Choose the intent, then the best-ranked active miner serving it that can actually
 * be addressed. Returns null when nothing can serve the question, which the caller
 * reports honestly rather than guessing.
 */
export async function route(question: string): Promise<Route | null> {
  const guess = classifyIntent(question);
  const candidates = guess ? [guess.intent, ...FALLBACKS] : FALLBACKS;

  const live = new Set((await getIntents()).filter((i) => i.miner_count > 0).map((i) => i.intent_id));
  for (const intent of candidates) {
    if (!live.has(intent)) continue;
    const board = await leaderboard(intent);
    const best = board.find((e) => (e.miner.endpoints?.length ?? 0) > 0);
    if (!best) continue;
    const why =
      guess && intent === guess.intent
        ? guess.why
        : `no rule matched, so it went to ${intent}, a general-purpose intent`;
    return { intent, miner: best.miner, rank: best.rank, why };
  }
  return null;
}
