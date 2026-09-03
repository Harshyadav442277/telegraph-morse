# PHASES.md — what ships in what order

Work top-down. A phase ships when its "done when" holds on the **live** deployment, not locally.
Criterion tags: A = adoption 45%, D = depth 25%, X = X 25%, T = technical 5%.

**Status 2026-09-02 18:15 UTC: Morse is paying and answering in production.** First live receipt
`0x0691ca3f…0821a1` (LiveCert #1 for SSL_VERIFICATION, $0.01, settled on-chain, `paidByMorse:
true`). **`MORSE_E2E_PAID=1 npm run e2e` is 7 passed, 0 skipped** (2026-09-03 05:20 UTC, run from a
second network so the key quota was fresh). Getting there needed Morse to stop using Telegraph's
router, which times out at ~47s against its own facilitator — see GAPS G17.

**Every channel has now paid for a real answer:** web, MCP (`telegraph_ask` →
`0x3807cfe1…a7b15`) and REST (`POST /v1/ask` → `0x82360f91…d20f95`), each with its own on-chain
settlement. Telegram is the one left, and it needs the webhook registered.

**Telegram is live** — @MyMorse_Bot, webhook registered 2026-09-03, 13 answered calls across 6
intents including the `weather` and `safe` recipes, every one with an on-chain settlement.
All four channels have now paid: web, telegram, mcp, rest.

**Still open for the operator:** post the X drafts ([docs/X_TO_POST.md](docs/X_TO_POST.md)), and
share the bot so the ledger stops being our own testing (GAPS G20).

## P0 — Decide and set up (2026-09-02) — DONE
- [x] Research Track 3 rubric, client APIs, baselines → [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md)
- [x] Plan, PRD, architecture → [PLAN.md](PLAN.md)
- [x] Public repo `telegraph-morse` created; CertWatch retired in the miner repo
- [x] Vercel project + Neon database + non-secret env vars (Claude, 2026-09-02)
- [ ] **Operator:** burner wallet funded → `EVM_PRIVATE_KEY`; BotFather token → `TELEGRAM_BOT_TOKEN`;
      and `TELEGRAM_BOT_USERNAME` so the site links the bot without a code change

## P1 — Core and Telegram bot (2026-09-02) [A, T]
- [x] `core/telegraph.ts`: paying fetch (x402 2.24.0), `ask()`, `askMiner()`, `verifySignal()`,
      catalogue + intents cache, confidence extraction via `signal_mapping`
- [x] x402 2.24.0 API shape verified against the installed packages, including the client's own
      default spend controls (GAPS G2)
- [x] The node's live 402 challenge fetched unpaid and diffed against our client — scheme, network,
      asset, EIP-712 version, price and timeout all match (`npm run preflight`; GAPS G17)
- [x] `core/ledger.ts`: Neon schema + migrations, `recordCall()`, counters
- [x] `core/guards.ts`: per-user/per-key/global limits, kill switch
- [x] `channels/telegram.ts`: webhook (secret-checked), free text → ask, `/help /stats /verify`,
      progress message edited in place, receipt formatting, group support
- [x] Deployed and serving: `/`, `/api/*`, `/v1/*`, `/keys`, `/mcp` all answer in production
      (2026-09-02 15:00 UTC; GAPS G13 closed)
- [x] Paying in production: real receipts, real settlement transactions, verified payer (GAPS G17)
- [x] Telegram live: webhook registered, 13 answered calls across 6 intents, recipes working in-chat
- [ ] **Operator:** share the bot so a stranger's message returns a live answer
- [ ] X post 1 — ready to post ([docs/X_TO_POST.md](docs/X_TO_POST.md))

## P2 — Web: landing, ledger, verify (2026-09-03) [A, D, T]
- [x] `/` landing: what Morse is, ask box, live counters, recent calls table with verify links,
      payer address, "how routing works"
- [x] `/verify/{hash}`: node record, payer match, the node's keccak256 attestation, payload —
      rendering verified against a real third-party signal without spending (GAPS G3, G3b)
- [x] `/api/stats` JSON for X screenshots and for judges; `usersAnswered` published next to `users`
      so the honest number leads (GAPS G4)
- [x] Playwright judge journey — `e2e/judge-journey.spec.ts`, **7 passed / 0 skipped** against
      production 2026-09-03
- [x] **done:** the ledger matches the API and every listed hash verifies as paid by Morse's wallet
      (e2e test 3, green against production)
- [ ] X post 2 with first real numbers — wait until the numbers are strangers', not ours (GAPS G20)

## P3 — Depth: recipes and second opinion (2026-09-03 → 09-04) [D]
- [x] Recipes: `safe`, `wallet`, `weather`, `fact` — **all four verified against production**,
      each fanning out to different #1 miners: safe → URL_SCAN + SSL_VERIFICATION + IP_GEOLOCATION,
      weather → WEATHER_CHECK + STORM_ALERT, wallet → WALLET_BALANCE_CHECK + FRAUD_DETECTION,
      fact → FACT_CHECK + NEWS_SEARCH
- [x] Second opinion on every surface: low-confidence threshold in Telegram *and* web, `/second`
      command, a button on the web answer card, `POST /api/second`, `telegraph_second_opinion`.
      Both miners and both ranks are shown.
- [x] Routing visibility: "served by #k for INTENT" on every receipt, from the live leaderboard
- [x] Daemon "what's hot" (`/hot` in Telegram, `telegraph_hot_signals` over MCP)
- [x] **done:** each recipe produces one combined verdict and N verifiable ledger rows. Running them
      for real found three routing bugs no unit test would have — see GAPS G14
- [x] Measured the whole catalogue for free (`npm run catalogue`): 57% of miners declare a
      confidence field, 4 publish a *risk* score in it, 29 publish >1 endpoint. Two real bugs fixed
      as a result — risk shown as confidence, and second opinions hitting the wrong endpoint
      (GAPS G8, G14)

## P4 — Developer surface (2026-09-04) [A, D]
- [x] `/keys`: issue a key (100/day cap, IP-limited), docs on the page
- [x] `/mcp` Streamable HTTP MCP server; `POST /v1/ask` REST
- [x] MCP handshake and all 7 tools verified against production with a real issued key; `/mcp`
      without a key returns 401 + `WWW-Authenticate`
- [x] README quick-starts: Claude Code one-liner, Cursor JSON, curl
- [x] **done:** a key issued from a clean network, `tools/call telegraph_ask` paid and answered
      (`0x3807cfe1…a7b15`, settled `0x4d117b30…0837d2`), and `POST /v1/ask` likewise
      (`0x82360f91…d20f95`). Both rows are in the public ledger.
- [ ] X post 3 — ready, see [docs/X_TO_POST.md](docs/X_TO_POST.md) post 6

## P5 — Freeze, rehearse, submit (2026-09-05 18:00 UTC → 09-07 23:59 UTC) [A, X, T]
- [ ] Feature freeze; only P1 bugs after this
- [x] [DEMO.md](DEMO.md) — exact steps and exact expected output, every ✅ line captured from
      production, every ⏳ line named as unproven
- [x] Health probe (`scripts/health-probe.mjs` + `.github/workflows/health.yml`), free-endpoint
      only so it cannot inflate call volume. Schedule confirmed firing — six runs, all green,
      though GitHub's cron runs hours late rather than every 30 minutes (GAPS G19)
- [x] Alarm proven end to end, all three paths: run 33648541786 opened issue #1, a repeat run
      stayed quiet, and run 33666604042 closed it once the deployment went healthy (GAPS G16)
- [ ] Closing X thread with ledger numbers and receipts
- [ ] **Submission form is OPEN** (GAPS G5) — paste from [SUBMISSION.md](SUBMISSION.md), connect a
      wallet, submit, and confirm it shows. Deadline Mon 07 Sep 2026 23:59:59 UTC (GAPS G6)

## Stretch (only after P5's freeze gate is green and there are zero open P1s)
- ERC-8183: "anchor this verdict" → `createJob` from the app wallet's escrow with a minimal
  callback contract that stores the result hash [D]
- Discord bot sharing the core, if the organizers welcome it in their server [A]
- Capped, labelled watches (`/watch storm <place>`), max 3 per user, 6-hourly, visible in the
  ledger as `channel=watch` [D] — dropped first if usage patterns ever look manufactured
