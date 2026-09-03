# TRY_THESE.md — questions to share

Every question below was run through Morse's real classifier and checked against the live intent
list: **26/26 route as intended, covering 25 of Telegraph's 45 canonical intents.** Re-check any
time with `npm run try-questions` — it costs nothing.

**Where to try them:** [@MyMorse_Bot](https://t.me/MyMorse_Bot) on Telegram, or the ask box at
<https://telegraph-morse.vercel.app>.

---

## Paste-into-a-group-chat version

> I built a bot for a hackathon — it asks a decentralised network of AI miners and shows you
> exactly who answered, how confident they were, what it cost, and a receipt you can verify
> on-chain. No wallet or signup needed.
>
> https://t.me/MyMorse_Bot
>
> Ask it anything, or try one of these:
> • Is the SSL certificate for github.com valid, and who issued it?
> • What is the current weather in Chennai?
> • Is https://example.com safe to visit?
> • What is the price of BTC right now?
> • Who painted the Mona Lisa?
>
> Genuinely curious whether it's useful — tell me what breaks.

**Ask for one honest try, not a volume favour.** One question each from twenty people is far better
evidence than a hundred from two, and it is the difference between adoption and something a judge
reads as manufactured (rule 04).

---

## The full set, by intent

### Security and infrastructure
| Intent | Question |
|---|---|
| SSL_VERIFICATION | Is the SSL certificate for github.com valid, and who issued it? |
| URL_SCAN | Is https://example.com safe to visit? |
| IP_GEOLOCATION | Where is the IP address 8.8.8.8 located? |
| CVE_LOOKUP | What is the vulnerability CVE-2024-3094? |

### Weather
| Intent | Question |
|---|---|
| WEATHER_CHECK | What is the current weather in Chennai? |
| WEATHER_FORECAST | What is the weather forecast for London tomorrow? |
| STORM_ALERT | Is there a storm risk in Mumbai over the next 48 hours? |

### Crypto and on-chain
| Intent | Question |
|---|---|
| CRYPTO_PRICE | What is the price of BTC right now? |
| GAS_PRICE | What is the gas price on Base? |
| TVL_LOOKUP | What is the TVL of Aave? |
| TOKEN_HOLDER_COUNT | How many holders does USDC have on Base? |
| WALLET_BALANCE_CHECK | What is the ETH balance of vitalik.eth? |
| FRAUD_DETECTION | Is the wallet vitalik.eth involved in fraud or scams? |

### Markets
| Intent | Question |
|---|---|
| STOCK_PRICE | What is the stock price of NVDA? |
| CURRENCY_EXCHANGE | What is the exchange rate from USD to INR? |

### Knowledge and news
| Intent | Question |
|---|---|
| FACT_CHECK | Is it true that the Eiffel Tower is in Berlin? |
| NEWS_HEADLINES | What are the top news headlines today? |
| NEWS_SEARCH | What is the latest news about OpenAI? |
| ACADEMIC_SEARCH | Find me a paper on retrieval augmented generation. |
| RESEARCH_SYNTHESIS | Summarise the research on intermittent fasting. |
| WEB_SEARCH | Search the web for the best coffee in Tokyo. |

### Language
| Intent | Question |
|---|---|
| LANGUAGE_TRANSLATION | Translate 'good morning, how are you' in Spanish. |
| SENTIMENT_ANALYSIS | What is the sentiment about Bitcoin right now? |
| AI_TEXT_DETECTION | Was this AI generated: 'The mitochondria is the powerhouse of the cell'? |
| CHAT_COMPLETION | Who painted the Mona Lisa? |
| CHAT_COMPLETION | Write me a two-line poem about the sea. |

---

## Recipes — one question, several miners

These fan out across intents and combine the answers. Best thing to show someone, because the
receipt list makes the network visible.

```
/safe https://example.com
/weather Chennai
/wallet vitalik.eth
/fact The Eiffel Tower is in Berlin
```

## Other commands

```
/second   ask the next-ranked miner the same question, and compare
/hot      what the network is asking itself right now
/verify   <signal hash> — check any receipt on the node
/stats    the public numbers
/help     everything
```

## For developers

```
claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp --header "Authorization: Bearer morse_YOURKEY"
```

Free key at <https://telegraph-morse.vercel.app/keys>. Seven tools, no wallet. This is the share
most likely to produce recurring, genuine call volume — an agent that keeps using it is real usage
in a way a one-off question is not.

---

## Honest caveats to pass on

- **Testnet.** Answers are real, the money is not — Base Sepolia USDC.
- **Some miners are flaky.** If one fails, Morse says so rather than inventing an answer, and moves
  to the next-ranked miner when the failure cost nothing.
- **Everything is public, including the question.** The ledger table at
  <https://telegraph-morse.vercel.app/#ledger> shows the intent, miner, cost and receipt. The
  question text itself is not in that table, but it **is** returned by the public
  `/api/recent` endpoint, clipped to 200 characters. Tell people not to type anything private.
