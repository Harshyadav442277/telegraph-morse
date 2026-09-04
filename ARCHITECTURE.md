# ARCHITECTURE.md — Morse

Code conforms to this. Update this file **before** deviating. Grounded in
[docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) (verified 2026-09-02).

## Shape

```
 Telegram user ──webhook──▶ ┌──────────────────────────────┐
 Web visitor  ──HTTPS────▶  │  Morse (Hono on Vercel, Node) │
 MCP client   ──/mcp─────▶  │  ├ channels: telegram, web,   │      x402 (USDC, Base Sepolia)
 REST client  ──/v1/ask──▶  │  │   mcp, rest                │ ────────────────────────────▶ Telegraph node
                            │  ├ core: ask(), recipes,      │  POST /engine/v1/ask          devnode.telegraphprotocol.com
                            │  │   direct /miner, verify   │  POST /engine/v1/ask/{id}
                            │  ├ guards: rate, budget, keys │  GET  /engine/v1/signal/{hash}
                            │  └ ledger: Neon Postgres      │  GET  /api/miners, /engine/v1/intents
                            └──────────────────────────────┘  GET  /daemon/api/questions/top
                                        │
                                        ▼
                     public ledger: /  /verify/{hash}  /api/stats
```

## Decisions

### A1 — One payer wallet, owned by the app, funded from the faucet
All paid calls are signed by one burner key held only in Vercel env (`EVM_PRIVATE_KEY`). This is
what makes usage **auditable**: every call is a USDC transfer from that address to the Diamond,
and every signal record on the node carries `wallet_address`. The address is published on the
stats page. Claude never handles the key; the operator sets it. Never the Track 1 miner wallet.

### A2 — Auto-routed `ask` is the default; every direct ask is explicit and says so
`POST /engine/v1/ask` lets Telegraph's router classify and route, which is what the protocol
measures and what the organizers want proven. Direct `POST /engine/v1/ask/{minerId}` runs only when
a person or agent asks for it: a miner named outright (`telegraph_ask_miner`, REST `miner`,
Telegram `/miner` — the dispatch the organizers' own reference apps use). The second opinion and
the Podium round that also used this path were retired on 2026-09-04 (GAPS G32). Every direct receipt states that routing was bypassed and
why, so plain questions still exercise the routing table. Miner ids are read live from `/api/miners?intent=`, never
hardcoded (they are not stable).

### A3 — Every answer carries a receipt, and the receipt is verifiable by anyone
Receipt = `{miner_slug, miner_id, intent, confidence?, cost_usd, duration_ms, signal_hash}`.
`/verify/{hash}` fetches `GET /engine/v1/signal/{hash}` server-side, shows the node's record, the
payer `wallet_address` (must equal ours), the `tx_hash` linked to sepolia.basescan.org, and the
payload the hash commits to. If the node's hash derivation is reproducible we recompute it (GAPS G3).

### A4 — Confidence is read from the miner's declared `signal_mapping.confidence_field`
Miners do not share a result schema. The catalogue's `signal_mapping` tells us where each miner
puts confidence, label and reason; we read those paths defensively and show "not reported" when
absent. Nothing keys off the number to spend more: the automatic second opinion that once did was
removed on 2026-09-04 (GAPS G32).

### A5 — Hono on Vercel Node runtime; ack fast, work in the background
Telegram retries webhooks that do not answer quickly, and miners can take 45s. The webhook handler
returns 200 immediately and finishes the ask inside `waitUntil` from `@vercel/functions`;
`maxDuration` is 60. If the platform limits prove lower on the Hobby plan (GAPS G1) the fallback is
a tiny always-on worker (Render/Railway/VPS) for the bot while the web stays on Vercel.

### A6 — Neon Postgres is the ledger; the ledger is the product's evidence
Tables: `users(id_hash, channel, first_seen, last_seen, calls)`, `calls(id, at, channel, user_hash,
kind, query_kind, intent, miner_slug, miner_id, confidence, cost_usd, duration_ms, signal_hash,
status, error)`, `api_keys(key_hash, label, daily_cap, issued_at, issuer_ip_hash)`,
`daily(day, calls, spent_usd)`. Identifiers are salted SHA-256; raw ids and query texts are not
stored beyond what the receipt needs (the intent and a 120-char preview, opt-in per channel).
Counters on `/` are computed from `calls`, never hand-maintained.

### A7 — Guards on everything that spends
Per Telegram user 40 calls/day, per web session 20/day, per API key 100/day (env-configurable),
a global daily budget, and a kill switch env var. A 402/422 from the node costs nothing (payment
settles only on 2xx) and is recorded as `status='unpaid'`. Rule 04 protection is a design
constraint: no code path calls the network without a human message, an agent tool call, or an
explicit REST call behind it.

### A8 — Recipes are real multi-intent work, not decoration
`safe <url>` → URL_SCAN + SSL_VERIFICATION + IP_GEOLOCATION of the host, combined into one
verdict with each receipt shown. `wallet <address>` → WALLET_BALANCE_CHECK + FRAUD_DETECTION.
`weather <place>` → WEATHER_CHECK + STORM_ALERT. `fact <claim>` → FACT_CHECK + NEWS_SEARCH. Each
sub-call is a separate ledger row. Recipes exist because they answer the user's real question
better, which is also what the 25% depth axis asks for.

### A9 — Hosted MCP and REST share the core and the keys
`/mcp` is a stateless Streamable HTTP MCP server (`@modelcontextprotocol/sdk`) exposing
`telegraph_ask`, `telegraph_ask_miner`, `telegraph_verify_signal`, `telegraph_intents`,
`telegraph_leaderboard`, `telegraph_hot_signals`, plus the recipes as tools. `POST /v1/ask` is the
same `ask()` for curl users. Both authenticate with a Bearer key issued at `/keys`.

### A10 — No mocks, no cached answers presented as fresh
Every answer shown to a user comes from a live engine call made for that user. The only caches are
the miner catalogue (60s) and the intents list (5 min), used for routing metadata, never for
answers. Tests that need the network run against the live 402 gate and are marked `live`.

### A11 — Secrets never enter the repo
`.env` is gitignored from the first commit. `.mcp.json` references `${ENV_VARS}` only. The payer
key exists in the operator's shell and Vercel env, nowhere else.

### A13 — Evidence pages read; they never spend
`/proof` reads the payer wallet's USDC transfers from Blockscout and reconciles them with the
ledger's settlement hashes. (`/consensus`, which derived agreement statistics from Podium rows, was
retired on 2026-09-04 — GAPS G32.) It makes no Telegraph call, so a judge (or a crawler) reloading
it cannot inflate anything (rule 04), and it degrades honestly: a failed chain read is reported as
such.

### A12 — Conventions
TypeScript strict, ESM, Node 22. Files under ~300 lines. Boring, explicit code. One task = one
change = one commit; commit messages describe the change and nothing else. Docs are the handoff
medium across sessions; keep them exact.

## Deployment

Vercel project `telegraph-morse` (scope `wukong4`), production via git push to `main` **and**
verified with `vercel --prod` if the Git integration is not connected (the miner repo learned this
the hard way). Env: `EVM_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`DATABASE_URL`, `ADMIN_TOKEN`, `HASH_SALT`, `DAILY_BUDGET_CALLS`, `KILL_SWITCH`,
`TELEGRAPH_NODE=https://devnode.telegraphprotocol.com`. Alarms: a GitHub Actions hourly probe of
`/api/health` (balance, last successful call age, error rate) that opens an issue on failure.
