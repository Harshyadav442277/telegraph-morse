# PHASES.md — what ships in what order

Work top-down. A phase ships when its "done when" holds on the **live** deployment, not locally.
Criterion tags: A = adoption 45%, D = depth 25%, X = X 25%, T = technical 5%.

## P0 — Decide and set up (2026-09-02) — DONE
- [x] Research Track 3 rubric, client APIs, baselines → [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md)
- [x] Plan, PRD, architecture → [PLAN.md](PLAN.md)
- [x] Public repo `telegraph-morse` created; CertWatch retired in the miner repo
- [ ] Operator: burner wallet funded, BotFather token, Vercel project + Neon, env vars set

## P1 — Core and Telegram bot (2026-09-02) [A, T]
- [ ] `core/telegraph.ts`: paying fetch (x402 2.24.0), `ask()`, `askMiner()`, `verifySignal()`,
      catalogue + intents cache, confidence extraction via `signal_mapping`
- [ ] `core/ledger.ts`: Neon schema + migrations, `recordCall()`, counters
- [ ] `core/guards.ts`: per-user/per-key/global limits, kill switch
- [ ] `channels/telegram.ts`: webhook (secret-checked), free text → ask, `/help /stats /verify`,
      progress message edited in place, receipt formatting, group support
- [ ] Deployed; **done when** a stranger's message in Telegram returns a live answer with a
      `signal_hash` that resolves at `/verify/{hash}`
- [ ] X post 1

## P2 — Web: landing, ledger, verify (2026-09-03) [A, D, T]
- [ ] `/` landing: what Morse is, ask box, live counters (users, calls, intents, miners, spent),
      recent calls table with verify links, payer address, "how routing works"
- [ ] `/verify/{hash}`: node record, payer match, BaseScan link, payload
- [ ] `/api/stats` JSON for X screenshots and for judges
- [ ] Playwright: judge journey (land → ask → receipt → verify)
- [ ] **done when** the ledger on `/` matches `SELECT count(*)` and every listed hash verifies
- [ ] X post 2 with first real numbers

## P3 — Depth: recipes and second opinion (2026-09-03 → 09-04) [D]
- [ ] Recipes: `safe`, `wallet`, `weather`, `fact` (bot commands + web chips + MCP tools)
- [ ] Second opinion: threshold + `/second` command; shows both miners and their ranks
- [ ] Routing visibility: "served by #k for INTENT" from the live leaderboard
- [ ] Daemon "what's hot" (`/hot`) from `/daemon/api/questions/top`
- [ ] **done when** each recipe produces one combined verdict and N ledger rows, all verifiable

## P4 — Developer surface (2026-09-04) [A, D]
- [ ] `/keys`: issue a key (100/day cap, IP-limited), docs on the page
- [ ] `/mcp` Streamable HTTP MCP server; `POST /v1/ask` REST
- [ ] README quick-starts: Claude Code one-liner, Cursor JSON, curl
- [ ] **done when** `claude mcp add --transport http morse https://<host>/mcp` works from a clean
      machine and the call appears in the public ledger
- [ ] X post 3

## P5 — Freeze, rehearse, submit (2026-09-05 18:00 UTC → 09-07 23:59 UTC) [A, X, T]
- [ ] Feature freeze; only P1 bugs after this
- [ ] DEMO.md with exact steps and exact expected output, run from a fresh clone and a dead network
      (what still renders: docs, ledger snapshot; what honestly cannot: live answers)
- [ ] GitHub Actions health probe + issue alarm proven to fire once
- [ ] Closing X thread with ledger numbers and receipts
- [ ] Submission when the Track 3 tab opens; confirm it shows

## Stretch (only after P5's freeze gate is green and there are zero open P1s)
- ERC-8183: "anchor this verdict" → `createJob` from the app wallet's escrow with a minimal
  callback contract that stores the result hash [D]
- Discord bot sharing the core, if the organizers welcome it in their server [A]
- Capped, labelled watches (`/watch storm <place>`), max 3 per user, 6-hourly, visible in the
  ledger as `channel=watch` [D] — dropped first if usage patterns ever look manufactured
