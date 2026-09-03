# DEMO.md — exact steps, exact expected output

Live: **<https://telegraph-morse.vercel.app>** · repo: <https://github.com/Harshyadav442277/telegraph-morse>

Every output below was captured from the live deployment on the date stated. Steps are marked:

- **✅ verified** — run against production, output pasted verbatim.
- **⏳ operator step** — needs an action only the operator can take.

Last capture: **2026-09-02 18:15 UTC**, with the wallet funded and Morse paying.

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

Verified against production, 2026-09-02 18:13 UTC:

```
miner  : LiveCert Operational Signals #1 for SSL_VERIFICATION
routing: Morse routed this: matched the SSL_VERIFICATION rule, then called the #1 miner
conf   : 100%   cost: $0.01   latency: ~1s
hash   : 0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1
tx     : 0x31b9b480548034ad571448194ea09bf12a13f3ad2903f88d3307dd191e2af007
answer : "…the certificate is currently valid, expiring in 88 days on 2026-11-29, issued by
          Sectigo Limited…"
```

**Morse does its own routing, and says so.** Telegraph's `/engine/v1/ask` router is unusable from a
serverless function — its settlement call times out after ~47s against Vercel's 60s ceiling — so
Morse classifies the intent itself, picks the best-ranked live miner, and calls it directly in
~200ms–4s. The receipt names the rule that fired and the rank that answered, which is more
transparent than a router's black box, and honestly weaker at classification. See GAPS G17.

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

→ (2026-09-02 18:14 UTC, paying)

```json
{"users":16,"usersAnswered":4,"calls":12,"okCalls":6,"intents":2,"miners":2,"spentUsd":0.06,"byChannel":{"web":6},"byIntent":[{"intent":"CRYPTO_PRICE","calls":4},{"intent":"SSL_VERIFICATION","calls":2}],"today":{"calls":6,"users":4},"firstCallAt":"2026-09-02T18:10:28.790Z","lastCallAt":"2026-09-02T18:14:15.781Z","ledger":"postgres","payer":"0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c"}
```

`usersAnswered` (4) is the honest headline; `users` (16) counts every identity that asked at all,
failures and this session's own test runs included — and today **all of them are ours** (GAPS G20). `"ledger":"postgres"` is the other claim that matters: the ledger is durable, not a serverless
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

`tools/list` returns seven tools: `telegraph_ask`, `telegraph_recipe`,
`telegraph_second_opinion`, `telegraph_verify_signal`, `telegraph_intents`,
`telegraph_leaderboard`, `telegraph_hot_signals`. Without a key, `/mcp` returns **401** with a
`WWW-Authenticate: Bearer realm="morse"` header — ✅ verified.

### 7 · Telegram — ✅ verified

Open **<https://t.me/MyMorse_Bot>**, send `/help`, then ask it anything.

Verified 2026-09-03: **13 answered calls across 6 intents** — SSL_VERIFICATION, URL_SCAN,
IP_GEOLOCATION, WEATHER_CHECK, WEATHER_FORECAST, STORM_ALERT — every one with its own on-chain
settlement, and including the `weather` and `safe` recipes run in-chat.

`/safe https://example.com` returns "Asking the network (safe)…" edited in place into a combined
verdict over three receipted calls. `/second` re-asks the next-ranked miner and prints both with
their ranks. `/hot` shows the Daemon's top signals. `/stats` prints the same numbers as
`/api/stats`.

---

## Run the judge journey yourself

```bash
git clone https://github.com/Harshyadav442277/telegraph-morse && cd telegraph-morse && npm ci
```

```bash
npm run e2e
```

Verified against production, 2026-09-02 18:14 UTC, with `MORSE_E2E_PAID=1`:

```
Running 7 tests using 1 worker
  ok 1 › the landing page states the claim and shows live counters
  ok 2 › the ledger on the page matches the API and the ledger is durable
  ok 3 › every signal hash in the ledger verifies on the node
  -  4 › an agent can pick up a key and reach the MCP server without a wallet
  ok 5 › the free discovery endpoints answer from the live network
  -  6 › an unfunded Morse says so instead of inventing an answer
  ok 7 › a funded Morse answers, receipts it, and the receipt verifies
  2 skipped
  5 passed
```

Without `MORSE_E2E_PAID=1` the suite is free to run and test 7 skips, so no schedule can ever spend
money or manufacture traffic (rule 04).

Both skips are conditional by design. Test 6 asserts the honest-failure path and only runs when the
wallet is *unfunded*. Test 4 skipped because this machine's network had already used its three API
keys for the UTC day (GAPS G18); it passed earlier the same day against the same deployment, and
the suite now caches its key so repeat runs stop burning the quota.

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

Expected today, verbatim:

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
**Caveat:** the cron has not yet been observed to fire — GitHub schedules are best-effort and this
repo is hours old (GAPS G19). The on-demand path is proven.

Proven on 2026-09-02: [run 33648541786](https://github.com/Harshyadav442277/telegraph-morse/actions/runs/33648541786)
opened [issue #1](https://github.com/Harshyadav442277/telegraph-morse/issues/1) with exactly the
output above. Repeat runs stay quiet unless the problem set changes or six hours pass.

## Fresh clone, dead network

```bash
npm ci && npm test
```

→ `Test Files 5 passed (5) · Tests 29 passed (29)` — the unit tests are offline and touch no
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
