# DEMO.md — exact steps, exact expected output

Live: **<https://telegraph-morse.vercel.app>** · repo: <https://github.com/Harshyadav442277/telegraph-morse>

Every output below was captured from the live deployment on the date stated. Steps are marked:

- **✅ verified** — run against production, output pasted verbatim.
- **⏳ operator step** — needs an action only the operator can take.

Last capture: **2026-09-04 10:42 UTC**, with the wallet funded and Morse paying; the paid judge
journey is 7/7.

**Retired 2026-09-04 15:30 UTC (GAPS G32):** steps 8 (Ask the podium) and 10 (consensus report)
describe features an organizer judged as re-ranking their leaderboard and as spam. They are kept
below as dated records of what was verified, and are removed from the running app before the
freeze; do not demonstrate them.

**Integrity note:** the ledger rows visible today are our own verification calls, not users. Real
and receipted, but not adoption — see GAPS G20.

---

## The 3-minute judge journey

### 1 · Land on the site — ✅ verified

Open <https://telegraph-morse.vercel.app>.

Expected: the M·O·R·S·E header; a one-paragraph claim mentioning **receipt**; six counters (people
answered / of who asked, answered calls, intents used, miners served, USDC paid, calls today); the
**Public ledger** table with a `durable` badge; a "How routing works" panel. While the wallet is
funded, there is no warning panel; when it is not, a yellow panel says so in the first screenful
rather than letting a visitor discover it by asking.

### 2 · Ask a question — ✅ verified

Type `Is the TLS certificate for github.com valid right now, and who issued it?` and press **Ask**.

Verified against production, 2026-09-04 10:33 UTC:

```
miner  : txlens #1 for SSL_VERIFICATION
routing: Telegraph's own router
conf   : 100%   cost: $0.01   latency: 525 ms
hash   : 0x579bacc9efae0c8e133e77e88d77503ef1d479bfe3640ddb6a1b699baaea7d0b
tx     : 0x4c58f68cecde025f361b5b49231132ac5e1ad01193d2b36cc29fc5988d2dafa8
answer : "The TLS/SSL certificate configuration for github.com is valid. Certificate validity:
          currently valid, expiring in 86 days on 2026-11-29, issued by Sectigo Limited on
          2026-09-01. Chain trust: the server presented a chain of 3 certificate(s)…"
```

The first capture, 2026-09-02 18:13 UTC, was LiveCert #1 chosen by Morse's own fallback while the
router was down: signal `0x0691ca3f…0821a1`, settled as `0x31b9b480…2af007`. Both rows are in the
ledger and both hashes still verify.

**Telegraph routes first; Morse only falls back.** The question goes to Telegraph's own router
(`POST /engine/v1/ask`) with a 20 s budget, and the receipt says `Routed by: Telegraph's own
router`. When the router does not answer — it timed out at ~47 s for a day on 2026-09-02, against
Vercel's 60 s ceiling — Morse classifies the intent with keyword rules, picks the best-ranked live
miner from the leaderboard, calls it directly, and the receipt names the rule that fired. Every
ledger row records which of the two happened. Since the fix of 2026-09-03 18:18 UTC: 38 plain
asks, 37 routed by Telegraph at a median 812 ms, one fallback (a RESEARCH_SYNTHESIS ask that hit
the 20 s budget), 38 of 38 answered. See GAPS G17 and G30.

### 3 · Verify the receipt — ✅ verified

Click the `verify 0x…` link.

```bash
curl -s https://telegraph-morse.vercel.app/api/verify/0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1
```

→ `paidByMorse: true`, `wallet_address: 0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c`,
`miner_slug: livecert`, `verification.verified: true`.

The page shows **Found on the node — yes**, **Paid by … = Morse's payer wallet** in green, the
node's own check (`verified — keccak256 over payload`), the **settlement tx** on BaseScan, Morse's
own ledger row, and the payload the hash covers.

Two honest limits. The settlement transaction is published only in the node's `payment-response`
header on the paying request, never in the signal record served afterwards — Morse captures it
there and stores it (GAPS G3b). And the hash itself is *shown, not re-derived*: eleven
serialisations of the payload as served failed to reproduce it, so Morse displays the node's
attestation rather than claiming to have recomputed it (GAPS G3).

An unknown hash returns 404 rather than inventing a record — ✅ verified.

### 4 · Read the public ledger — ✅ verified

```bash
curl -s https://telegraph-morse.vercel.app/api/stats
```

→ (2026-09-04 10:42 UTC, paying)

```json
{"users":62,"usersAnswered":42,"calls":210,"okCalls":171,"intents":20,"miners":40,"spentUsd":1.71,"byChannel":{"rest":2,"telegram":52,"mcp":1,"web":116},"byIntent":[{"intent":"SSL_VERIFICATION","calls":25},{"intent":"CHAT_COMPLETION","calls":24},{"intent":"WEATHER_CHECK","calls":23},{"intent":"STORM_ALERT","calls":14},{"intent":"CRYPTO_PRICE","calls":11},{"intent":"GAME_RESULT","calls":10},{"intent":"NEWS_HEADLINES","calls":8},{"intent":"ACADEMIC_SEARCH","calls":8},{"intent":"FACT_CHECK","calls":8},{"intent":"URL_SCAN","calls":7},{"intent":"CONTENT_EXTRACTION","calls":7},{"intent":"LANGUAGE_TRANSLATION","calls":6},{"intent":"WEATHER_FORECAST","calls":6},{"intent":"IP_GEOLOCATION","calls":5},{"intent":"RESEARCH_SYNTHESIS","calls":2},{"intent":"FRAUD_DETECTION","calls":2},{"intent":"AI_TEXT_DETECTION","calls":2},{"intent":"CONTENT_MODERATION","calls":1},{"intent":"WALLET_BALANCE_CHECK","calls":1},{"intent":"NEWS_SEARCH","calls":1}],"today":{"calls":53,"users":9},"firstCallAt":"2026-09-02T18:10:28.790Z","lastCallAt":"2026-09-04T10:42:41.427Z","ledger":"postgres","payer":"0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c"}
```

`usersAnswered` (42) is the honest headline; `users` (62) counts every identity that asked at all,
failures and our own test runs included — and most rows are still our own testing (GAPS G20).
`"ledger":"postgres"` is the other claim that matters: the ledger is durable, not a serverless
scratch buffer that resets. `/api/recent?limit=200` returns the same rows the page shows, with the
user hash stripped.

### 5 · Free discovery, no key — ✅ verified

```bash
curl -s https://telegraph-morse.vercel.app/v1/leaderboard/SSL_VERIFICATION
```

→

```json
{"intent":"SSL_VERIFICATION","miners":[{"slug":"livecert","id":"4433","rank":1,"score":0.010817},{"slug":"preflight-ssl-verification","id":"20260828","rank":2,"score":0.008216214},{"slug":"txlens","id":"9002","rank":3,"score":0.0079644425},{"slug":"netwire-ssl","id":"7332","rank":4,"score":0.006151576},{"slug":"ssllabs","id":"227","rank":5,"score":0.0016850345},{"slug":"certspotter-cert-verification","id":"10","rank":6,"score":0}]}
```

That ordering is exactly where routing sends traffic, and the `#rank` on every Morse receipt comes
from it. `curl -s .../v1/intents` returns the live canonical set — **45 intents** on 2026-09-02.

### 6 · Point an agent at it, no wallet — ✅ verified

Get a key (three per network per UTC day):

```bash
curl -s -X POST https://telegraph-morse.vercel.app/api/keys -H "content-type: application/json" -d '{"label":"judge"}'
```

→ `{"key":"morse_…","dailyCap":100,"note":"Shown once. Send as Authorization: Bearer <key>."}`

Add it to Claude Code:

```bash
claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp --header "Authorization: Bearer morse_YOURKEY"
```

The MCP handshake and tool list, verified against production:

```bash
curl -s -X POST https://telegraph-morse.vercel.app/mcp -H "authorization: Bearer morse_YOURKEY" -H "content-type: application/json" -H "accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"judge","version":"0"}}}'
```

→

```
event: message
data: {"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"morse","version":"0.1.0"}},"jsonrpc":"2.0","id":1}
```

`tools/list` returns nine tools (re-verified 2026-09-04): `telegraph_ask`, `telegraph_ask_miner`,
`telegraph_podium`, `telegraph_recipe`, `telegraph_second_opinion`, `telegraph_verify_signal`,
`telegraph_intents`, `telegraph_leaderboard`, `telegraph_hot_signals`. Without a key, `/mcp` returns **401** with a
`WWW-Authenticate: Bearer realm="morse"` header — ✅ verified.

### 7 · Telegram — ✅ verified

Open **<https://t.me/MyMorse_Bot>**, send `/help`, then ask it anything.

Verified 2026-09-03: **13 answered calls across 6 intents** — SSL_VERIFICATION, URL_SCAN,
IP_GEOLOCATION, WEATHER_CHECK, WEATHER_FORECAST, STORM_ALERT — every one with its own on-chain
settlement, and including the `weather` and `safe` recipes run in-chat. By 2026-09-04 10:30 UTC the
Telegram channel had 52 calls in the ledger, including podium rounds started from the button under
an answer.

`/safe https://example.com` returns "Asking the network (safe)…" edited in place into a combined
verdict over three receipted calls. `/second` re-asks the next-ranked miner and prints both with
their ranks. `/hot` shows the Daemon's top signals. `/stats` prints the same numbers as
`/api/stats`.

### 8 · Ask the podium — RETIRED 2026-09-04 (was ✅ verified 2026-09-03 18:46 UTC; record only)

After step 2, click **Ask the podium — the other top-ranked miners answer this too**.

Verified against production, same question as step 2:

```
routed  : Telegraph's own router → txlens, #1 for SSL_VERIFICATION (9.0 s, engine)
podium  : livecert #2 and preflight-ssl-verification #3 asked directly (5.6 s total)
verdict : 3 of 3 miners agree: valid.
receipts: 0xa488f91a… (original) · 0x3a4e74a6… (#2) · 0x9eb30b2f… (#3), each settled on-chain
ledger  : two rows of kind `podium`, grouped to the original answer's row id
```

And the honest failure, same session, `What is the price of BTC right now?` (CRYPTO_PRICE):

```
routed  : onchain-intel-miner #1 → "BTC is 81019.01 USD"
podium  : pricepulse-crypto-consensus #2 skipped (cannot be addressed from a sentence);
          sentinel-risk-oracle #3 answered "price data temporarily unavailable";
          kriterion-pramagraph #4 timed out at 15 s (recorded as timeout, nothing charged)
verdict : Only 1 of 2 answers contained a comparable figure, so agreement cannot be judged.
```

Podium never fakes agreement: the second case is shown exactly like that, with every attempt in
the ledger. In Telegram the same flow is the **Ask the podium** button under every answer, or
`/podium` for your last question.

---

### 9 · On-chain proof — ✅ verified 2026-09-04 04:15 UTC

Open <https://telegraph-morse.vercel.app/proof>, or:

```bash
curl -s https://telegraph-morse.vercel.app/api/proof
```

→ (2026-09-04 10:35 UTC; the response also lists the chain-only and ledger-only items)

```json
{"chain":{"transfers":174,"toDiamond":174,"usdc":1.74,"first":"2026-09-02T17:56:56.000000Z","last":"2026-09-04T10:33:58.000000Z"},"ledger":{"okRows":170,"withSettlement":170},"matched":170,"ledgerOnly":0,"chainOnly":4,"error":null}
```

Every settlement hash in the ledger is a USDC transfer from Morse's payer to Telegraph's Diamond,
read from Blockscout rather than from Morse's own database. The four chain-only settlements are
listed on the page, not hidden (GAPS G29). The page reads the chain and never asks the network, so
reloading it costs nothing.

### 10 · Consensus report — RETIRED 2026-09-04 (was ✅ verified 2026-09-04 04:15 UTC; record only)

Open <https://telegraph-morse.vercel.app/consensus>, or:

```bash
curl -s https://telegraph-morse.vercel.app/api/consensus
```

→ totals `{"rounds":16,"agree":2,"disagree":1,"undetermined":13,"extraCalls":29,"secondOpinions":23}`
(2026-09-04 10:35 UTC; the response also carries every round and a per-intent table) — 16 rounds
over 11 intents: SSL_VERIFICATION "3 of 3 miners agree: valid"; WEATHER_CHECK one round agreeing
and one disagreeing; CRYPTO_PRICE "only 1 of 2 answers contained a comparable figure"; the
free-text intents shown side by side and not judged. Every member links its receipt. Computed from
ledger rows that already exist.

### 11 · Ask a named miner — ✅ verified 2026-09-04 04:16 UTC

```bash
curl -s -X POST https://telegraph-morse.vercel.app/v1/ask -H "Authorization: Bearer morse_YOURKEY" -H "content-type: application/json" -d '{"miner":"livecert","question":"Is the SSL certificate for github.com valid, and who issued it?"}'
```

→ `ok: true`, `kind: "direct"`, `routedBy: "morse"`, served by `livecert` #1 for SSL_VERIFICATION in
810 ms for $0.01, signal `0x444c07ac…5315`, settled as `0x4d3b6885…d6af`, and
`routerReasoning: "Morse called livecert (#1 for SSL_VERIFICATION) directly, at your request."`
An unknown slug is refused for free: `No miner called "no-such-miner" is in the catalogue.` Over MCP
the same is `telegraph_ask_miner` (nine tools listed); in Telegram, `/miner livecert <question>` —
the command already works, and appears in the `/` menu after the operator re-runs the webhook
registration.

## Run the judge journey yourself

```bash
git clone https://github.com/Harshyadav442277/telegraph-morse && cd telegraph-morse && npm ci
```

```bash
npm run e2e
```

Verified against production, 2026-09-04 10:42 UTC, with `MORSE_E2E_PAID=1`:

```
Running 7 tests using 1 worker
  ok 1 › the landing page states the claim and shows live counters (6.8s)
  ok 2 › the ledger on the page matches the API and the ledger is durable (1.6s)
  ok 3 › every signal hash in the ledger verifies on the node (6.8s)
  ok 4 › an agent can pick up a key and reach the MCP server without a wallet (1.3s)
  ok 5 › the free discovery endpoints answer from the live network (1.8s)
  ok 6 › Morse fails honestly instead of inventing an answer (893ms)
  ok 7 › a funded Morse answers, receipts it, and the receipt verifies (7.2s)
  7 passed (27.0s)
```

Without `MORSE_E2E_PAID=1` the suite is free to run and test 7 skips, so no schedule can ever spend
money or manufacture traffic (rule 04). Test 4 needs an API key and caches the one it issues in
`.morse-e2e-key`, because keys are capped at three per network per UTC day (GAPS G18). Test 6
asserts the honest-failure contract whether or not the wallet is funded.

The run before this one, at 10:33 UTC the same day, failed step 7 while production answered
correctly: the answer card had been rebuilt the day before and the test still looked for the old
markup (GAPS G31). Re-run the paid journey the same day as any UI change.

Point it at any deployment with `MORSE_BASE_URL=https://… npm run e2e`.

## Preflight, before the first paid call

```bash
npm run preflight
```

Spends nothing. It derives the payer from `EVM_PRIVATE_KEY`, reads its USDC and ETH balances over a
public RPC, fetches the node's 402 challenge **without paying it**, and diffs that challenge against
what our own x402 client is configured to satisfy. Verified output today, with no key set:

```
WALLET
  FAIL payer key                     EVM_PRIVATE_KEY is not set or malformed
  FAIL paid work enabled             blocked: no payer key

THE NODE'S 402 CHALLENGE (fetched, not paid)
  x402 version 2, 2 payment options offered
  ok   scheme                        exact — we register ExactEvmScheme
  ok   network                       eip155:84532 — we register eip155:84532
  ok   asset vs our constant         0x036CbD53842c5426634e7929541eC2318f3dCF7e
  ok   asset vs DEFAULT_ASSETS       0x036CbD53842c5426634e7929541eC2318f3dCF7e — so the client's default spend controls permit it
  ok   EIP-712 domain version        challenge says "2", client assumes "2"
  ok   price vs client cap           $0.0100 against the $1 default cap
  ok   our timeout vs theirs         we abort at 45s, the node allows 60s
```

Every field the client must satisfy already matches. Only the EIP-3009 signature, the on-chain
settlement and the returned `signal_hash` need a real call.

## What the catalogue says — ✅ verified, free

```bash
npm run catalogue
```

Reads the public `/api/miners` once, engages no miner, spends nothing. It is where the numbers in
GAPS G8 and G14 come from, and it found two real bugs in Morse: four miners publish a *risk* score
in their `confidence_field` (a high number means more danger, not more certainty), and 29 miners
publish more than one endpoint, so picking `endpoints[0]` for a direct second opinion sent
fraud questions to a transaction-lookup endpoint. Both are fixed and covered by tests.

## Health probe

```bash
node scripts/health-probe.mjs
```

Expected today (2026-09-04 10:35 UTC), verbatim:

```
HEALTHY · https://telegraph-morse.vercel.app · 2026-09-04T10:35:32.675Z
ledger postgres · payer 0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c · 58.26 USDC · paid true · telegram true
41/61 people answered · 170/209 calls answered · 20 intents · 40 miners · $1.7 spent
```

And what it printed while the deployment was unfunded on 2026-09-02, verbatim:

```
ALARM · https://telegraph-morse.vercel.app · 2026-09-02T15:29:19.421Z
ledger postgres · payer none · ? USDC · paid false · telegram false
0/4 people answered · 0/0 calls answered · 0 intents · 0 miners · $0 spent
  problem: /api/health reports ok:false (HTTP 503)
  problem: paid work is disabled: no payer key, no daily budget, or the kill switch is on
  note: the Telegram bot token is not set
```

Exit 1 = alarm, 0 = healthy, 2 = the probe could not run. `.github/workflows/health.yml` runs it
on demand and, in principle, every 30 minutes; it opens (or comments on, or closes) one
`health-alarm` issue. The probe only reads free endpoints, so no schedule can inflate call volume.
The schedule does fire, hours apart rather than every 30 minutes: the eight most recent scheduled
runs to 2026-09-04 05:38 UTC were all green (GAPS G19). The on-demand path is proven.

Proven on 2026-09-02: [run 33648541786](https://github.com/Harshyadav442277/telegraph-morse/actions/runs/33648541786)
opened [issue #1](https://github.com/Harshyadav442277/telegraph-morse/issues/1) with exactly the
output above. Repeat runs stay quiet unless the problem set changes or six hours pass.

## Fresh clone, dead network

```bash
npm ci && npm test
```

→ `Test Files 13 passed (13) · Tests 81 passed (81)` — the unit tests are offline and touch no
network.

```bash
HASH_SALT=local DAILY_BUDGET_CALLS=0 npm run dev
```

→ `morse on http://localhost:3000` / `ledger: memory · payer: none · paid work: DISABLED`

With no network the site still renders, the ledger shows the `ephemeral · dev` badge instead of
`durable`, and asking fails with the reachability error. It never shows a cached or canned answer
(ARCHITECTURE A10).

## What is deliberately not in the demo

- **On-chain ERC-8183 jobs.** Designed, not built; a stretch item behind the freeze gate.
- **Recomputing the signal hash.** Telegraph does not publish the scheme, so `/verify` shows the
  node's record and the settlement transfer, and says so (GAPS G3).
- **Any traffic Morse generated for itself.** Every row in the ledger has a human message, an agent
  tool call, or an explicit REST call behind it (rule 04).
