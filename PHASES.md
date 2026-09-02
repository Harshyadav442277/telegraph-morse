# PHASES.md — what ships in what order

Work top-down. A phase ships when its "done when" holds on the **live** deployment, not locally.
Criterion tags: A = adoption 45%, D = depth 25%, X = X 25%, T = technical 5%.

**Blocker as of 2026-09-02 18:00 UTC: the node refuses our payments.** The wallet is funded and
live (`/api/health` green, payer `0xfBB3…4c9c`, 20 USDC), but every paid call returns
`invalid_exact_evm_signature` even though the authorization matches the USDC contract's own domain
separator and recovers to the right payer. Reproducible with `npm run diagnose-payment`, needs no
wallet. This is node-side; see GAPS G17. Everything not behind a paid call is done.

**Previously:** `EVM_PRIVATE_KEY` and `TELEGRAM_BOT_TOKEN` were not in Vercel production.
Claude never touches either (rule 1). Everything marked ⏳ below is built, typechecked and
deployed, and unprovable until they land. See GAPS G17, and **[GO-LIVE.md](GO-LIVE.md)** for the
exact operator sequence — wallet, faucet, BotFather, `npm run preflight`, the first real call.

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
- [ ] ⏳ **done when** a stranger's message in Telegram returns a live answer with a `signal_hash`
      that resolves at `/verify/{hash}`
- [ ] ⏳ X post 1 — draft ready with real numbers, in [docs/X_POSTS.md](docs/X_POSTS.md)

## P2 — Web: landing, ledger, verify (2026-09-03) [A, D, T]
- [x] `/` landing: what Morse is, ask box, live counters, recent calls table with verify links,
      payer address, "how routing works"
- [x] `/verify/{hash}`: node record, payer match, the node's keccak256 attestation, payload —
      rendering verified against a real third-party signal without spending (GAPS G3, G3b)
- [x] `/api/stats` JSON for X screenshots and for judges; `usersAnswered` published next to `users`
      so the honest number leads (GAPS G4)
- [x] Playwright judge journey — `e2e/judge-journey.spec.ts`, 5 passed against production
      2026-09-02, 2 skipped because they need the wallet
- [ ] ⏳ **done when** the ledger on `/` matches `SELECT count(*)` **and every listed hash verifies**
      — the first half is asserted and green, the second needs one real receipt
- [ ] ⏳ X post 2 with first real numbers

## P3 — Depth: recipes and second opinion (2026-09-03 → 09-04) [D]
- [x] Recipes: `safe`, `wallet`, `weather`, `fact` (bot commands + web chips + MCP tools) — built,
      unmeasured on real miners
- [x] Second opinion on every surface: low-confidence threshold in Telegram *and* web, `/second`
      command, a button on the web answer card, `POST /api/second`, `telegraph_second_opinion`.
      Both miners and both ranks are shown.
- [x] Routing visibility: "served by #k for INTENT" on every receipt, from the live leaderboard
- [x] Daemon "what's hot" (`/hot` in Telegram, `telegraph_hot_signals` over MCP)
- [ ] ⏳ **done when** each recipe produces one combined verdict and N ledger rows, all verifiable
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
- [ ] ⏳ **done when** `claude mcp add --transport http morse https://<host>/mcp` works from a clean
      machine **and the call appears in the public ledger** — the transport half is proven, the
      paid call is not
- [ ] ⏳ X post 3

## P5 — Freeze, rehearse, submit (2026-09-05 18:00 UTC → 09-07 23:59 UTC) [A, X, T]
- [ ] Feature freeze; only P1 bugs after this
- [x] [DEMO.md](DEMO.md) — exact steps and exact expected output, every ✅ line captured from
      production, every ⏳ line named as unproven
- [x] Health probe (`scripts/health-probe.mjs` + `.github/workflows/health.yml`), free-endpoint
      only so it cannot inflate call volume. Works on demand; **the 30-minute schedule has not yet
      been observed to fire** (GAPS G19)
- [x] Alarm proven end to end: run 33648541786 opened issue #1 with the probe output; the
      workflow now de-duplicates "still broken" comments (GAPS G16)
- [ ] Closing X thread with ledger numbers and receipts
- [ ] Submission when the Track 3 tab opens; confirm it shows (GAPS G5)

## Stretch (only after P5's freeze gate is green and there are zero open P1s)
- ERC-8183: "anchor this verdict" → `createJob` from the app wallet's escrow with a minimal
  callback contract that stores the result hash [D]
- Discord bot sharing the core, if the organizers welcome it in their server [A]
- Capped, labelled watches (`/watch storm <place>`), max 3 per user, 6-hourly, visible in the
  ledger as `channel=watch` [D] — dropped first if usage patterns ever look manufactured
