# Morse — ask Telegram, get a receipt from the Telegraph network

A Telegraph Hackathon Season I, **Track 3** application.

Morse lets anyone use the [Telegraph](https://telegraphprotocol.com) miner network without a
wallet: ask a question in Telegram or on the web, or call one hosted MCP/REST endpoint from your
agent. Morse pays the x402 fee from one app-owned wallet, routes the question through Telegraph's
engine, and returns the answer with a **receipt** — the miner that served it, the intent the
router chose, the miner's confidence, cost, latency, and a `signal_hash` you can verify on the node
and on Base Sepolia. Every call Morse makes is listed in a public ledger.

**Status (2026-09-02):** planning complete, build starting. Live URL and bot link will appear here
when P1 ships. See [PLAN.md](PLAN.md) and [PHASES.md](PHASES.md).

## Why

Consuming Telegraph today needs a wallet, testnet USDC from a faucet, and an x402 client. That
keeps out everyone who is not already a developer with a burner key, and it means the network's
"real usage" is mostly machines calling one miner. Morse is the missing front door, and because
every answer carries a verifiable receipt, its usage is evidence rather than a claim.

## Docs

- [PLAN.md](PLAN.md) — claim, reality checks, judging criteria, schedule, tooling
- [PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PHASES.md](PHASES.md)
- [GAPS.md](GAPS.md) — what is missing, broken, or unverified (read before trusting a claim)
- [MEMORY.md](MEMORY.md) — decisions and lessons
- [DEMO.md](DEMO.md) — the judge journey with exact expected output
- [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) — protocol facts, sourced and dated

## Assumptions and limitations

Copied from [GAPS.md](GAPS.md) as they are resolved. Nothing here is verified until it is.

## License

MIT
