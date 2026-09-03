/**
 * Example questions, one source for the web page, the Telegram /start keyboard, the
 * docs and the `try-questions` check. Each one routes to the intent it names through
 * Morse's fallback classifier (checked by `npm run try-questions`); Telegraph's own
 * router usually agrees, and the receipt says which one decided.
 */
export interface Example {
  intent: string;
  q: string;
  /** Short label for a chip or a button. */
  label: string;
}

export const EXAMPLES: Example[] = [
  { intent: "SSL_VERIFICATION", label: "TLS check", q: "Is the SSL certificate for github.com valid, and who issued it?" },
  { intent: "URL_SCAN", label: "Link safety", q: "Is https://example.com safe to visit?" },
  { intent: "IP_GEOLOCATION", label: "IP location", q: "Where is the IP address 8.8.8.8 located?" },
  { intent: "CVE_LOOKUP", label: "CVE", q: "What is the vulnerability CVE-2024-3094?" },
  { intent: "STORM_ALERT", label: "Storm risk", q: "Is there a storm risk in Mumbai over the next 48 hours?" },
  { intent: "WEATHER_FORECAST", label: "Forecast", q: "What is the weather forecast for London tomorrow?" },
  { intent: "WEATHER_CHECK", label: "Weather", q: "What is the current weather in Chennai?" },
  { intent: "CRYPTO_PRICE", label: "BTC price", q: "What is the price of BTC right now?" },
  { intent: "GAS_PRICE", label: "Gas", q: "What is the gas price on Base?" },
  { intent: "TVL_LOOKUP", label: "TVL", q: "What is the TVL of Aave?" },
  { intent: "TOKEN_HOLDER_COUNT", label: "Holders", q: "How many holders does USDC have on Base?" },
  { intent: "WALLET_BALANCE_CHECK", label: "Wallet", q: "What is the ETH balance of vitalik.eth?" },
  { intent: "FRAUD_DETECTION", label: "Fraud risk", q: "Is the wallet vitalik.eth involved in fraud or scams?" },
  { intent: "STOCK_PRICE", label: "Stock", q: "What is the stock price of NVDA?" },
  { intent: "CURRENCY_EXCHANGE", label: "FX rate", q: "What is the exchange rate from USD to INR?" },
  { intent: "FACT_CHECK", label: "Fact check", q: "Is it true that the Eiffel Tower is in Berlin?" },
  { intent: "NEWS_HEADLINES", label: "Headlines", q: "What are the top news headlines today?" },
  { intent: "NEWS_SEARCH", label: "News", q: "What is the latest news about OpenAI?" },
  { intent: "ACADEMIC_SEARCH", label: "Papers", q: "Find me a paper on retrieval augmented generation." },
  { intent: "LANGUAGE_TRANSLATION", label: "Translate", q: "Translate 'good morning, how are you' in Spanish." },
  { intent: "SENTIMENT_ANALYSIS", label: "Sentiment", q: "What is the sentiment about Bitcoin right now?" },
  { intent: "AI_TEXT_DETECTION", label: "AI or human?", q: "Was this AI generated: 'The mitochondria is the powerhouse of the cell'?" },
  { intent: "RESEARCH_SYNTHESIS", label: "Research", q: "Summarise the research on intermittent fasting." },
  { intent: "WEB_SEARCH", label: "Web search", q: "Search the web for the best coffee in Tokyo." },
  { intent: "CHAT_COMPLETION", label: "General", q: "Who painted the Mona Lisa?" },
  { intent: "CHAT_COMPLETION", label: "Creative", q: "Write me a two-line poem about the sea." },
];

/** The eight shown first: the ones where a receipt from a specialised miner is most striking. */
export const QUICK_INTENTS = ["SSL_VERIFICATION", "URL_SCAN", "WEATHER_CHECK", "STORM_ALERT", "CRYPTO_PRICE", "WALLET_BALANCE_CHECK", "FACT_CHECK", "LANGUAGE_TRANSLATION"];

export const QUICK: Example[] = QUICK_INTENTS.map((i) => EXAMPLES.find((e) => e.intent === i)!).filter(Boolean);

/** Groups for the "What can I ask?" panel. */
export const GROUPS: Array<{ title: string; intents: string[] }> = [
  { title: "Security and infrastructure", intents: ["SSL_VERIFICATION", "URL_SCAN", "IP_GEOLOCATION", "CVE_LOOKUP"] },
  { title: "Weather", intents: ["WEATHER_CHECK", "WEATHER_FORECAST", "STORM_ALERT"] },
  { title: "Crypto and on-chain", intents: ["CRYPTO_PRICE", "GAS_PRICE", "TVL_LOOKUP", "TOKEN_HOLDER_COUNT", "WALLET_BALANCE_CHECK", "FRAUD_DETECTION"] },
  { title: "Markets", intents: ["STOCK_PRICE", "CURRENCY_EXCHANGE"] },
  { title: "Knowledge and news", intents: ["FACT_CHECK", "NEWS_HEADLINES", "NEWS_SEARCH", "ACADEMIC_SEARCH", "RESEARCH_SYNTHESIS", "WEB_SEARCH"] },
  { title: "Language and general", intents: ["LANGUAGE_TRANSLATION", "SENTIMENT_ANALYSIS", "AI_TEXT_DETECTION", "CHAT_COMPLETION"] },
];

/**
 * A slash command typed where the user expected a bot: `/safe https://x`, `/weather Pune`.
 * People bring Telegram habits to the web box, and a recipe name typed there used to be
 * sent to the network as a chat question.
 */
export function parseSlash(text: string): { command: string; input: string } | null {
  const m = /^\/([a-z_]+)(?:@\w+)?\s*(.*)$/is.exec(text.trim());
  if (!m) return null;
  return { command: m[1]!.toLowerCase(), input: (m[2] ?? "").trim() };
}
