# DEMO.md — exact steps, exact expected output

Live: **<https://telegraph-morse.vercel.app>** · repo: <https://github.com/Harshyadav442277/telegraph-morse>

Every output below was captured from the live deployment on the date stated. Steps are marked:

- **✅ verified** — run against production, output pasted verbatim.
- **⏳ needs the wallet** — the code path is built and typechecked, but it spends USDC, so it is
  unproven until the operator sets `EVM_PRIVATE_KEY` in Vercel. Nothing here is faked to look
  finished (rule 01).

Last capture: **2026-09-02 15:29 UTC**, when the payer wallet was not yet configured.

---

## The 3-minute judge journey

### 1 · Land on the site — ✅ verified

Open <https://telegraph-morse.vercel.app>.

Expected: the M·O·R·S·E header; a one-paragraph claim mentioning **receipt**; six counters (people
answered / of who asked, answered calls, intents used, miners served, USDC paid, calls today); the
**Public ledger** table with a `durable` badge; a "How routing works" panel. While the wallet is
unfunded, a yellow panel says so in the first screenful:

> **Morse is not funded yet.** The payer wallet or daily budget is not configured, so asking is
> disabled until the operator funds it. Everything else on this page is live.

### 2 · Ask a question — ⏳ needs the wallet

Type `Is the TLS certificate for github.com valid right now?` and press **Ask**.

Expected when funded, within ~15 s: an answer card, then a receipt line reading
`served by <miner> #<rank> for SSL_VERIFICATION · confidence NN% · $0.01 · NNN ms · verify 0x…`,
and a **Second opinion from the next-ranked miner** button.

Expected today, verbatim from production:

```json
{"ok":false,"kind":"ask","question":"Is the TLS certificate for github.com valid right now?","receipt":null,"second":null,"error":"Morse has no funded wallet or no daily budget yet, so it cannot ask the network.","remaining":0,"rowId":null}
```

That is the whole point of the honest-failure path: no canned answer ever appears.

### 3 · Verify the receipt — ⏳ needs the wallet

Click the `verify 0x…` link, landing on `/verify/{hash}`.

Expected: a table with **Found on the node — yes** linking to
`devnode.telegraphprotocol.com/engine/v1/signal/{hash}`; the miner slug; **Paid by** showing the
wallet address with the green note `= Morse's payer wallet`; the USDC **settlement tx** linked to
`sepolia.basescan.org`; Morse's own ledger row; and the payload the hash covers, pretty-printed.

An unknown hash returns HTTP 404 and says so rather than inventing a record — ✅ verified:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://telegraph-morse.vercel.app/verify/0x0000000000000000000000000000000000000000000000000000000000000000
```

→ `404`

### 4 · Read the public ledger — ✅ verified

```bash
curl -s https://telegraph-morse.vercel.app/api/stats
```

→ (2026-09-02 15:29 UTC, before funding)

```json
{"users":4,"usersAnswered":0,"calls":0,"okCalls":0,"intents":0,"miners":0,"spentUsd":0,"byChannel":{},"byIntent":[],"today":{"calls":0,"users":0},"firstCallAt":null,"lastCallAt":null,"ledger":"postgres","payer":null}
```

`usersAnswered` (0) is the honest headline; `users` (4) counts every identity that asked at all,
this session's own end-to-end runs included. `"ledger":"postgres"` is the other claim that matters: the ledger is durable, not a serverless
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

### 7 · Telegram — ⏳ needs the bot token

Open the bot, send `/safe https://example.com`.

Expected: `Asking the network (safe)…` edited in place into a combined verdict over three
receipted calls (URL_SCAN, SSL_VERIFICATION, and IP_GEOLOCATION of the resolved address). Then
`/second` re-asks the last question of the next-ranked miner and prints both miners with their
ranks. `/hot` shows the Daemon's top signals; `/stats` prints the same numbers as `/api/stats`.

---

## Run the judge journey yourself

```bash
git clone https://github.com/Harshyadav442277/telegraph-morse && cd telegraph-morse && npm ci
```

```bash
npm run e2e
```

Expected today, verbatim (2026-09-02, production unfunded):

```
Running 7 tests using 1 worker
  ok 1 › 1 · the landing page states the claim and shows live counters
  ok 2 › 2 · the ledger on the page matches the API and the ledger is durable
  -  3 › 3 · every signal hash in the ledger verifies on the node
  -  4 › 4 · an agent can pick up a key and reach the MCP server without a wallet
  ok 5 › 5 · the free discovery endpoints answer from the live network
  ok 6 › 6 · an unfunded Morse says so instead of inventing an answer
  -  7 › 7 · a funded Morse answers, receipts it, and the receipt verifies
  3 skipped
  4 passed
```

Tests 3 and 7 need the wallet. Test 4 passed earlier the same day against production — the MCP
handshake and all seven tools — and skips now only because this machine's network has already
used its three keys for the UTC day (GAPS G18); the suite caches its key in `.morse-e2e-key`, so a
fresh clone issues one and every later run reuses it. Set `MORSE_TEST_KEY` to run it regardless.

Once the wallet is funded, tests 3 and 7 run — 7 only with `MORSE_E2E_PAID=1`, so no schedule can
spend money or manufacture traffic (rule 04).

Point it at any deployment with `MORSE_BASE_URL=https://… npm run e2e`.

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
every 30 minutes and opens (or comments on, or closes) one `health-alarm` issue. The probe only
reads free endpoints, so the schedule cannot inflate call volume.

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
