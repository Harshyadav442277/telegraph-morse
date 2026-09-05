# Morse routing report for the Telegraph organisers

Prepared 2026-09-05 13:30 UTC from Morse's public ledger (the 200 newest rows, 2026-09-04 04:16 to
2026-09-05 13:07 UTC), the Morse source at commit `407d08c`, Vercel's runtime logs, and one free probe
of the node. Everything here can be re-checked from the links in § 8.

## The short version

1. **The "Morse (fallback)" rows in the screenshot are not router failures.** They are legs of Morse's
   `/safe` and `/weather` recipes, which by design never call `POST /engine/v1/ask`. The public label is
   wrong for those rows. That is a Morse bug, not a Telegraph one. Every one of those legs called
   `POST /engine/v1/ask/{minerId}` directly, answered, and settled on chain.
2. **In the same minute, every question that did go to Telegraph's router was answered by it:** four
   calls, 225 to 835 ms.
3. **Real router fallbacks are rare:** 1 of 19 plain questions today, 14 of 82 yesterday, and 11 of
   those 14 were inside one 10-second burst of 25 identical requests from our side.
4. **Every error in the ledger since 2026-09-04 04:16 UTC is listed verbatim in § 4:** 28 rows, all on
   2026-09-04, all on the direct path `/engine/v1/ask/{minerId}`, none on the router. Zero errors today.
5. **What Morse cannot show:** the router's own error text for the 15 real fallbacks. It was written only
   to Vercel's console, which keeps logs for one hour. Morse will store it on the ledger row from now on.

## 1. What the screenshot shows

Ledger columns: time (UTC) · channel · kind · intent · miner and its rank at the time · who chose the
miner · the miner's confidence · price · latency in ms · status · settlement transaction.

`kind` is the command that produced the row. `ask` is a plain question. `safe`, `weather`, `fact` and
`wallet` are recipes: one command that asks two or three questions to different intents, one after
another. In the screenshot, the three rows at 05:54:54, 05:54:57 and 05:54:58 are one
`/safe https://telegraphprotocol.com/` command. The two rows at 05:54:10 and 05:54:14 are one
`/weather beijing` command.

| Time (UTC) | Kind | Intent | Miner (rank) | Chosen by | Router called? | ms | Status | Settlement tx |
|---|---|---|---|---|---|---|---|---|
| 05:46:12 | ask | STORM_ALERT | txlens (#1) | Telegraph router | yes | 579 | ok | `0x5f246cc9f2eecf16c709e9ea7c317af665b752a1813317433ce299f4c958933b` |
| 05:47:03 | fact | FACT_CHECK | qarinah-proofpack (#1) | Morse | no (recipe leg) | 10721 | ok | `0xb55200d285b9f883c187a4669af13a10944b95cf64771f424fd23baccf22dee8` |
| 05:47:17 | fact | NEWS_SEARCH | tavily (#1) | Morse | no (recipe leg) | 1693 | ok | `0xaf42134364d20d739e17027cb0f9cbec4f288aa614cf099f867ae3119e0ecebc` |
| 05:48:13 | ask | FACT_CHECK | livecert (#2) | Morse | yes, no answer within 20 s | 595 | ok | `0xa80ab32c325ff3cfee9032d26d99d8bdc1c6973f300bf97ee16be93c85ec42f8` |
| 05:49:05 | fact | FACT_CHECK | qarinah-proofpack (#1) | Morse | no (recipe leg) | 8785 | ok | `0x0646c494ec529d1bea68bfd9a4ff1e89c1a0214509ab8cbf9846e178c29c1757` |
| 05:49:16 | fact | NEWS_SEARCH | tavily (#1) | Morse | no (recipe leg) | 2137 | ok | `0x6d890d7a67fa308619506247479bfc8cabc2b40da66d795fb77f64e797570ea3` |
| 05:53:27 | fact | FACT_CHECK | qarinah-proofpack (#1) | Morse | no (recipe leg) | 12230 | ok | `0x173dbab0cc96e7fc87ac4516cbdd7523117348b5c7a2d63490d49b4c7fec99a9` |
| 05:53:44 | fact | NEWS_SEARCH | tavily (#1) | Morse | no (recipe leg) | 4362 | ok | `0xa374c9e83e2c82eac59579c15fb135db3a8b5f33472a4caafe71d4d7d19221bd` |
| 05:53:56 | ask | WALLET_BALANCE_CHECK | chainwire-wallet-balance (#1) | Telegraph router | yes | 785 | ok | `0x93104e9fb87826ac84e0a22d09823ae8aebfa848a593c22555cc0003a40351ed` |
| 05:53:58 | ask | WALLET_BALANCE_CHECK | chainwire-wallet-balance (#1) | Telegraph router | yes | 230 | ok | `0xc8809e2b248e3bc6554bebbc3d031c293ddbdcf1aead9c058ddb46bfdee91a7a` |
| 05:53:59 | ask | WALLET_BALANCE_CHECK | chainwire-wallet-balance (#1) | Telegraph router | yes | 225 | ok | `0x2daa6d4677713ca66d7c064892120c4f24401da96bf97ea062272b13a320aae2` |
| 05:54:10 | weather | WEATHER_CHECK | livecert (#1) | Morse | no (recipe leg) | 849 | ok | `0x0a1fce077e94aba6be3a36f7019ef89558db6619bc444847b0731cbef4800442` |
| 05:54:14 | weather | STORM_ALERT | txlens (#1) | Morse | no (recipe leg) | 1128 | ok | `0x9ae1210865a253c9bb19935e47ebd232f98ffd31223617fa743991bec73b6995` |
| 05:54:30 | ask | STORM_ALERT | txlens (#1) | Telegraph router | yes | 835 | ok | `0xdea91505e9f743786256441708c03c38ce69d97cb75aa8e22b9bd16624ce569e` |
| 05:54:54 | safe | URL_SCAN | netwire-url-scan (#1) | Morse | no (recipe leg) | 971 | ok | `0x9f11345ab01f665c4e9db82025fd788e427b61592942e5f1878070b02b41978c` |
| 05:54:57 | safe | SSL_VERIFICATION | livecert (#1) | Morse | no (recipe leg) | 290 | ok | `0x21d6d87ad2d7952d1c5bb9b28bb46ba6d623e362a18b6926fd55a3304d497f7a` |
| 05:54:58 | safe | IP_GEOLOCATION | netwire-ip-geolocation (#1) | Morse | no (recipe leg) | 689 | ok | `0x2eadf2be191835bb0fd8f93f176eb2277982517bfbad4e7edb7b60be373f6361` |

Each settlement transaction is a USDC transfer from Morse's payer wallet
`0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c` to the Diamond on Base Sepolia. Morse's `/proof` page
reconciled the ledger against the chain at 13:12 UTC today: every settled ledger row has its
transaction on chain, and zero rows are ledger-only.

## 2. Why recipe rows say "Morse (fallback)"

Morse tries Telegraph's router first on every plain question, on a 20-second leash, and routes the
question itself only when the router does not answer. Recipes skip the router step on purpose: a
recipe makes up to three paid calls inside one 60-second Vercel function, and three 20-second router
attempts plus three direct calls do not fit. The code:

```ts
// src/core/recipes.ts — every recipe leg passes skipGuard = true
for (const q of plan.questions) cards.push(await asker(ctx, q, recipe.name, true, plan.subject));

// src/core/ask.ts — Telegraph's router is only tried when skipGuard is false
if (cfg.USE_ENGINE_ROUTER && !skipGuard) {
  const viaEngine = await tryEngineRouter(question);   // POST /engine/v1/ask
  ...
}
// otherwise Morse picks the intent by keyword rule, takes the best-ranked miner it can
// address from /api/miners, and calls POST /engine/v1/ask/{minerId}
```

The ledger page's label function has no case for recipe rows, so they fall through to the fallback
label:

```ts
// src/web/landing.ts
if (r.routedBy === "engine") return "Telegraph";
if (r.kind === "direct")     return "Morse (named miner)";
return "Morse (fallback)";   // reached by every recipe row as well
```

The FAQ under the ledger says "Morse (fallback): the router did not answer within 20 s and Morse
routed the question itself". That is true only for `kind = ask` rows. For recipe rows nothing on
Telegraph's side failed, because Telegraph's router was never asked.

## 3. The real router fallbacks

A plain question (`kind = ask`) with `routed by = morse` is a genuine fallback: Telegraph's router
was called and either returned an error or did not answer within 20 s, and Morse routed the question
itself. Every such row in the 200-row window:

| Time (UTC) | Channel | Intent | Miner (rank) | Status | ms | Question |
|---|---|---|---|---|---|---|
| 2026-09-04 09:37:37 | telegram | RESEARCH_SYNTHESIS | qarinah-proofpack (#1) | ok | 29067 | Synthesize recent research on the effectiveness of AI coding |
| 2026-09-04 12:00:01 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:02 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:02 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:04 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:04 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:05 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:06 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:07 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:07 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:08 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:00:09 | web | FACT_CHECK | qarinah-proofpack (#1) | error | - | Is it true that the Eiffel Tower is in Berlin? |
| 2026-09-04 12:03:29 | web | CHAT_COMPLETION | groq-llama31-instant-miner (#2) | ok | 666 | What is the current best performing crypto |
| 2026-09-04 14:07:20 | web | CHAT_COMPLETION | groq-llama31-instant-miner (#2) | ok | 720 | track the base sepolia price |
| 2026-09-05 05:48:13 | web | FACT_CHECK | livecert (#2) | ok | 595 | Is it true that the Eiffel Tower is in Berlin? |

The 11 rows at 12:00:01 to 12:00:09 belong to a burst of 25 identical requests fired within 10
seconds from our side, not a visitor. The router answered 14 of the 25 (CHAT_COMPLETION →
bedrock-qwen #1) and did not answer 11. Those 11 then hit a broken miner on the direct path (§ 4a).
Since a fix deployed at 16:50 UTC that day, Morse moves to the next-ranked miner when a miner
returns a 5xx.

Plain questions only, per day:

| Day | Router answered | Fell back to Morse | Router latency p50 / p90 / max (ms) |
|---|---|---|---|
| 2026-09-04 | 68 | 14 (3 answered, 11 failed) | 1125 / 4498 / 15639 |
| 2026-09-05, to 13:07 UTC | 18 | 1 (answered) | 754 / 1172 / 1589 |

## 4. Every error in the ledger, verbatim

28 rows in the window have a status other than `ok`. All are on 2026-09-04 and all are responses
to `POST /engine/v1/ask/{minerId}`. The ledger stores the first 300 characters of what the node
returned. Grouped by cause:

### 4a. A miner's 500 relayed by the node — 11 rows

qarinah-proofpack, then #1 for FACT_CHECK, 12:00:01 to 12:00:09 UTC, every row identical:

```
Engine returned 500: {"error":"upstream call failed: status 500: {\"error\":{\"code\":\"PROOF_PIPELINE_ERROR\",\"message\":\"The ProofPack pipeline failed safely before emitting a result.\"}}"}
```

Miner-side. Not charged: no settlement on any of the 11. The same miner answered normally at 05:47
and 05:49 today.

### 4b. The node's call to one miner cancelled — 10 rows in 17 seconds

kriterion-pramagraph, #3 for CRYPTO_PRICE, 13:50:13 to 13:50:30 UTC, ten attempts in one podium
round (a feature Morse retired an hour later):

- 13:50:13 — `Engine returned 504: <!DOCTYPE html> <!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]--> …` (a Cloudflare 504 page: the node did not answer Cloudflare in time)
- 13:50:19, 13:50:21, 13:50:22, 13:50:23, 13:50:25, 13:50:27 — `Engine returned 500: {"error":"upstream call failed: context canceled"}` (six times)
- 13:50:28, 13:50:28, 13:50:30 — `The network did not answer within 15s.` (three times; this is Morse's own 15 s leash on podium legs)

Router calls before and after were fine: 13:41:46 CRYPTO_PRICE → sentinel-risk-oracle #1 in 550 ms,
and 13:51:07 SSL_VERIFICATION → txlens #1 in 646 ms. So this looks like the node's call to that one
miner being cancelled, not the node being down. **This is the one we would like you to look at.**

### 4c. The facilitator refused a payment while another was in flight — 2 rows

07:52:51 (microlink-url-extraction #2, CONTENT_EXTRACTION) and 13:51:06 (telegraph-chatbot #9,
CHAT_COMPLETION):

```
The node refused the payment: batch_send_failed:missing_or_invalid_parameters_double_check_you_hav
```

Both were podium legs paid in parallel from the one wallet. Morse now sends recipe legs one at a
time because of this.

### 4d. The node's pre-validation — 3 rows

langwire-translation #4, LANGUAGE_TRANSLATION, at 08:27:53, 09:32:36 and 12:02:37:

```
The node predicted this request would fail: {"error":"request is predicted to fail","proceed_anyway":{"field":"acknowledge_warnings","note":"resend with this field set to run the request regardless; you are charged only if it runs","value":true
```

Working as designed. Morse treats it as free and moves to the next miner.

### 4e. A miner's 422 relayed as a 500 — 1 row

veritarach-ai-text-detector #3, AI_TEXT_DETECTION, 14:12:16:

```
Engine returned 500: {"error":"upstream error 422: {\"detail\":[{\"type\":\"missing\",\"loc\":[\"body\",\"text\"],\"msg\":\"Field required\",\"input\":{\"query\":\"detect ai in the following - \\\"### The Magic of Rain Ra
```

Our fault on the payload: the miner wants `text`, Morse sent `query`. Two things you may still want
to know: the miner's 4xx came back as a 500, and pre-validation did not catch the missing required
field.

### 4f. One 15-second timeout — 1 row

06:54:42, qarinah-proofpack #2, FACT_CHECK, podium leg: `The network did not answer within 15s.`

## 5. The router from Morse's side, day by day

- **2026-09-02.** `POST /engine/v1/ask` was unusable from Morse: after about 47 s it returned
  `settle request failed: Post "https://facilitator.payai.network/settle": context deadline exceeded`,
  while `POST /engine/v1/ask/{minerId}` settled in about 4 s. Morse shipped that day with its own
  routing.
- **2026-09-03.** The router answered in 6.5 s. Morse switched to router-first with a 20 s cap and
  its own routing as the fallback.
- **2026-09-04, measured at 10:35 UTC.** 38 plain questions since the switch, 37 answered by the
  router, median 812 ms, one fallback.
- **2026-09-05.** 18 of 19 plain questions answered by the router, p50 754 ms. An unpaid probe of
  `POST /engine/v1/ask` at 13:05:21 UTC returned the HTTP 402 challenge in 1.37 s, as expected. Paid
  router calls at 13:04 to 13:07 UTC were all answered, in 75 to 986 ms.

## 6. What Morse cannot show, and what changes

When the router attempt fails, Morse logs the reason to the function's console and falls back; the
ledger row records only that Morse routed the question. Vercel keeps those console logs for one hour
on our plan. Checked today: a query for the window 6 h to 1 h ago returns nothing, and 50 min to
20 min ago returns logs. So for the 15 fallbacks in § 3 we have the time, the question and the
outcome, but not the router's error text.

Changes on Morse's side, written down and not yet deployed:

1. Label recipe rows "Morse (recipe)" and correct the FAQ. A public label must not imply a router
   failure that did not happen.
2. Store the router's error on the ledger row, so the next report has the text.

Nothing else changes. Morse still asks Telegraph's router first on every plain question.

## 7. Questions for you

1. Is there anything on the node's side at 13:50:13 to 13:50:30 UTC on 2026-09-04 for payer
   `0xfBB3…4c9c` and miner kriterion-pramagraph: one 504, then six `upstream call failed: context canceled`?
2. Is `batch_send_failed:missing_or_invalid_parameters…` the expected response when two payments
   from one payer are in flight, and is one-at-a-time the intended client behaviour?
3. Should a miner's 4xx be relayed as a 4xx rather than a 500?
4. If the node keeps router logs, the 15 timestamps in § 3 are the ones to look at for payer
   `0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c`.

## 8. Check it yourself

- Ledger: <https://telegraph-morse.vercel.app/> — JSON: <https://telegraph-morse.vercel.app/api/recent?limit=200>
- Chain reconciliation: <https://telegraph-morse.vercel.app/proof> — JSON: <https://telegraph-morse.vercel.app/api/proof>
- Any receipt: `https://telegraph-morse.vercel.app/verify/{signalHash}`; the node's own record: `https://devnode.telegraphprotocol.com/engine/v1/signal/{signalHash}`
- Any settlement: `https://sepolia.basescan.org/tx/{tx}`
- Source: <https://github.com/Harshyadav442277/telegraph-morse> — `src/core/ask.ts`, `src/core/recipes.ts`, `src/web/landing.ts`

Environment: Vercel serverless, 60 s maximum duration, 1024 MB. Router leash 20 s, direct-call leash
45 s (15 s on the retired podium legs). x402 client `@x402/*` 2.24.0, the same pin as Telegraph-MCP.
Node <https://devnode.telegraphprotocol.com>, USDC on Base Sepolia (`eip155:84532`).
