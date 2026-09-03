/**
 * Prints the sample questions in docs/TRY_THESE.md and checks each one against the
 * real classifier and the live intent list.
 *
 *   npm run try-questions
 *
 * Free: it classifies locally and reads the node's free intent list. It asks nothing
 * and pays nothing, so it can be run as often as you like (rule 04).
 *
 * Run it before sharing the list — a rule change or a miner deregistration can leave
 * a question pointing at an intent nobody serves, and it is better to find that here
 * than in front of someone trying the bot.
 */
import { classifyIntent } from "../src/core/route.js";
import { getIntents } from "../src/core/telegraph.js";

export const QUESTIONS: Array<{ intent: string; q: string }> = [
  { intent: "SSL_VERIFICATION", q: "Is the SSL certificate for github.com valid, and who issued it?" },
  { intent: "URL_SCAN", q: "Is https://example.com safe to visit?" },
  { intent: "IP_GEOLOCATION", q: "Where is the IP address 8.8.8.8 located?" },
  { intent: "CVE_LOOKUP", q: "What is the vulnerability CVE-2024-3094?" },
  { intent: "STORM_ALERT", q: "Is there a storm risk in Mumbai over the next 48 hours?" },
  { intent: "WEATHER_FORECAST", q: "What is the weather forecast for London tomorrow?" },
  { intent: "WEATHER_CHECK", q: "What is the current weather in Chennai?" },
  { intent: "CRYPTO_PRICE", q: "What is the price of BTC right now?" },
  { intent: "GAS_PRICE", q: "What is the gas price on Base?" },
  { intent: "TVL_LOOKUP", q: "What is the TVL of Aave?" },
  { intent: "TOKEN_HOLDER_COUNT", q: "How many holders does USDC have on Base?" },
  { intent: "WALLET_BALANCE_CHECK", q: "What is the ETH balance of vitalik.eth?" },
  { intent: "FRAUD_DETECTION", q: "Is the wallet vitalik.eth involved in fraud or scams?" },
  { intent: "STOCK_PRICE", q: "What is the stock price of NVDA?" },
  { intent: "CURRENCY_EXCHANGE", q: "What is the exchange rate from USD to INR?" },
  { intent: "FACT_CHECK", q: "Is it true that the Eiffel Tower is in Berlin?" },
  { intent: "NEWS_HEADLINES", q: "What are the top news headlines today?" },
  { intent: "NEWS_SEARCH", q: "What is the latest news about OpenAI?" },
  { intent: "ACADEMIC_SEARCH", q: "Find me a paper on retrieval augmented generation." },
  { intent: "LANGUAGE_TRANSLATION", q: "Translate 'good morning, how are you' in Spanish." },
  { intent: "SENTIMENT_ANALYSIS", q: "What is the sentiment about Bitcoin right now?" },
  { intent: "AI_TEXT_DETECTION", q: "Was this AI generated: 'The mitochondria is the powerhouse of the cell'?" },
  { intent: "RESEARCH_SYNTHESIS", q: "Summarise the research on intermittent fasting." },
  { intent: "WEB_SEARCH", q: "Search the web for the best coffee in Tokyo." },
  { intent: "CHAT_COMPLETION", q: "Who painted the Mona Lisa?" },
  { intent: "CHAT_COMPLETION", q: "Write me a two-line poem about the sea." },
];

async function main(): Promise<void> {
  const live = new Set((await getIntents()).filter((i) => i.miner_count > 0).map((i) => i.intent_id));
  let bad = 0;

  console.log(`\n${QUESTIONS.length} sample questions, checked ${new Date().toISOString()}\n`);
  for (const { intent, q } of QUESTIONS) {
    const got = classifyIntent(q)?.intent ?? "CHAT_COMPLETION";
    const routesRight = got === intent;
    const hasMiner = live.has(got);
    const flag = !routesRight ? `MISROUTED → ${got}` : !hasMiner ? "NO LIVE MINER" : "ok";
    if (flag !== "ok") bad++;
    console.log(`  ${flag === "ok" ? "ok  " : "FAIL"} ${intent.padEnd(22)} ${q}`);
    if (flag !== "ok") console.log(`       ${flag}`);
  }

  const covered = new Set(QUESTIONS.map((x) => x.intent));
  console.log(`\n${covered.size} distinct intents covered, ${QUESTIONS.length - bad}/${QUESTIONS.length} routing as intended.`);
  if (bad > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`try-questions failed: ${(e as Error).message}`);
  process.exitCode = 1;
});
