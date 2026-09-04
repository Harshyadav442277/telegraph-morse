# PRD.md — Morse

**Status:** scope frozen 2026-09-02. Feature freeze **2026-09-05 18:00 UTC**. Track 3 closes
**2026-09-07 23:59 UTC**.

## What

Morse is the consumer and agent front door to the Telegraph network. A person asks a question in
Telegram or on the web; an agent calls a hosted MCP tool or a REST endpoint. Morse pays the x402
fee from one app-owned wallet, routes the question through `POST /engine/v1/ask`, and returns the
answer with a **receipt**: the miner that served it, the intent the router chose, the miner's
confidence when it reports one, cost, latency, the `signal_hash`, and a link to verify it on the
node and on Base Sepolia.

## For whom

| User | Job to be done | Surface |
|---|---|---|
| Anyone in a Telegram chat | quick verified answers: weather, prices, fact checks, translations, "is this link safe", "what is this wallet" | Telegram bot, works in groups |
| A curious visitor from X | try the network once, see the receipt, understand routing | web `/` |
| A judge | check that users and calls are real | web ledger, `/verify/{hash}`, on-chain transfers |
| An agent developer | use Telegraph from Claude Code / Cursor / any MCP client with no wallet | hosted MCP `/mcp`, REST `/v1/ask` with a free key |

## Success criteria (measurable, published on the stats page)

| # | Criterion | Target by 2026-09-07 | Criterion served |
|---|---|---|---|
| S1 | Distinct real users (Telegram user ids + web sessions + API keys, hashed) | ≥ 100 | adoption 45% |
| S2 | Paid Telegraph calls, each with a `signal_hash` | ≥ 2,000 | adoption 45% |
| S3 | Distinct intents exercised by real traffic | ≥ 8 | depth 25% |
| S4 | Every call verifiable: `/verify/{hash}` resolves and the payer matches | 100% | depth, technical |
| S5 | Public X updates tagged @Telegraphprotoc | ≥ 5 posts + 1 closing thread | X 25% |
| S6 | Uptime of the bot and web from launch to close | no outage > 30 min | technical 5%, adoption |
| S7 | Zero mocked or cached-as-fresh answers | 0 | rule 01 |

S1 and S2 are the must-haves. S4 and S7 are non-negotiable honesty properties.

## In scope

- Telegram bot: free-text questions, command recipes, `/verify`, `/stats`, `/help`; group support.
- Web: landing, ask box, live public ledger and counters, `/verify/{hash}`, "how routing works".
- Hosted MCP (Streamable HTTP) and REST with self-issued keys and daily caps.
- Recipes combining intents: `safe <url>`, `wallet <address>`, `weather <place>`, `fact <claim>`.
- ~~Second opinion: direct ask to the next-ranked miner for the same intent when confidence is
  below a threshold or when the user asks.~~ **Retired 2026-09-04** with the podium and the
  consensus report, on organizer feedback: the leaderboard is the consensus, N miners per
  question is uneconomic for an end user, and it reads as spam (GAPS G32).
- Public ledger in Postgres; counters computed from it; low-balance and error alarms.
- Budgets: per user, per key, global daily; a kill switch.

## Non-goals

- Own miners or any answer not produced by a live Telegraph miner (rule 01).
- Accounts, passwords, payments from users. Testnet only.
- Unattended traffic generation. Scheduled watches are a stretch item with strict caps and
  labelling, and are dropped first if anything looks like inflation.
- Mainnet, tokens, MACHINA economics.
- **Re-ranking or checking miners ourselves** — no podium, no automatic second opinion, no
  miner-check tooling, no consensus report. Telegraph's validators and leaderboard are the
  judgement layer; Morse is the front door and the receipt (organizer, 2026-09-04; GAPS G32).

## Open decisions

- **D1 — Bot name.** Resolved 2026-09-03: `@MyMorse_Bot`.
- **D2 — Second-opinion threshold.** Resolved 2026-09-04: **0**, automatic second opinion off, the
  feature removed before the freeze (GAPS G32). It fired on 16 of 118 answers while it was on.
- **D3 — Stretch order.** Resolved 2026-09-03: none of the three ships before the close. ERC-8183
  anchoring and the Daemon feed are recorded as deliberate omissions (GAPS G27, G28); watches were
  dropped for rule-04 optics; a Discord bot was never offered by the organizers.
- **D4 — Key issuance friction.** Start with no signup (button issues a key, 100 calls/day, IP
  limited). Tighten only if abused.
