# Morse — Telegraph in Telegram

A Telegraph Hackathon Season I, **Track 3** application.
**Live: <https://telegraph-morse.vercel.app>** · [public ledger](https://telegraph-morse.vercel.app/#ledger) · [API & MCP](https://telegraph-morse.vercel.app/keys)

**Telegraph in Telegram. Ask, get an answer from a ranked miner, with a receipt.** Send a question
to the bot — no wallet, no key, no sign-up — and [Telegraph](https://telegraphprotocol.com)'s own
router classifies it and picks a ranked miner (Morse falls back to its own routing only when the
router does not answer), Morse pays the x402 fee from one app-owned wallet, and the answer comes
back with a **receipt**: the miner that served it, the intent and why it was chosen, that miner's
rank, its confidence, the cost, the latency, the on-chain settlement transaction, and a
`signal_hash` you can verify on the node. The same thing is on the web and behind one hosted
MCP/REST endpoint for agents.

Live example, 2026-09-02: LiveCert #1 for `SSL_VERIFICATION`, $0.01, signal
[`0x0691ca3f…0821a1`](https://telegraph-morse.vercel.app/verify/0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1),
settled on-chain as [`0x31b9b480…2af007`](https://sepolia.basescan.org/tx/0x31b9b480548034ad571448194ea09bf12a13f3ad2903f88d3307dd191e2af007).

Every call Morse makes is in a public ledger, so "people used it" is checkable rather than
claimed.

**What Morse deliberately does not do.** It does not re-rank miners. Telegraph's leaderboard is
the consensus and the router's pick is the answer, so there is no podium, no automatic second
opinion and no consensus report. Those were built, measured and retired on 2026-09-04 after an
organizer pointed out that paying several miners per question to re-derive the ranking is what the
protocol already does once for everyone, does not work economically for a user, and looks like
spam. The ledger keeps their rows, labelled; the code leaves before the freeze (GAPS G32).

**One check that does not rely on Morse's word.** [`/proof`](https://telegraph-morse.vercel.app/proof)
reads the payer wallet's USDC transfers on Base Sepolia from a public indexer and matches them,
hash for hash, against the ledger's settlement transactions — the "actual volume of Telegraph
calls" counted from the chain, with any settlement the ledger lacks shown rather than hidden. It is
computed from data that already exists and spends nothing.

**Not an aggregator.** Morse does not pick providers or blend answers. Telegraph's ranked router
picks the miner; Morse pays and keeps the receipt. When you *do* want a specific miner — the
dispatch the organizers' own reference apps use — name it: `telegraph_ask_miner` over MCP,
`{"miner": "livecert", "question": "…"}` on REST, `/miner livecert <question>` in Telegram. The
receipt says routing was bypassed at your request.

## Why

Consuming Telegraph today needs a wallet, testnet USDC from a faucet, and an x402 client. That
keeps out everyone who is not already a developer with a burner key, and it means the network's
"real usage" is mostly machines calling one miner. Morse is the missing front door, and because
every answer carries a verifiable receipt, its usage is evidence rather than a claim.

## Quick start

### Claude Code (MCP, no wallet)

Get a free key at [/keys](https://telegraph-morse.vercel.app/keys), then:

```bash
claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp --header "Authorization: Bearer morse_YOURKEY"
```

Then ask Claude anything the network can answer — *"use telegraph_ask: is the TLS certificate for
github.com valid, and who issued it?"*, then *"use telegraph_verify_signal on that signal_hash"*.
Tools: `telegraph_ask`, `telegraph_ask_miner`, `telegraph_recipe`, `telegraph_verify_signal`. Intents
and leaderboards are free over REST at `/v1/intents` and `/v1/leaderboard/{INTENT}`; the three MCP
discovery tools that duplicated Telegraph's explorer were removed on 2026-09-05.

### Cursor, or any Streamable-HTTP MCP client

```json
{
  "mcpServers": {
    "morse": {
      "url": "https://telegraph-morse.vercel.app/mcp",
      "headers": { "Authorization": "Bearer morse_YOURKEY" }
    }
  }
}
```

### curl

```bash
curl -X POST https://telegraph-morse.vercel.app/api/keys -H "content-type: application/json" -d '{"label":"my-laptop"}'
```

```bash
curl -X POST https://telegraph-morse.vercel.app/v1/ask -H "Authorization: Bearer morse_YOURKEY" -H "content-type: application/json" -d '{"question":"What is the current weather in Chennai?"}'
```

Ask one named miner directly (miner authors: your own slug goes here):

```bash
curl -X POST https://telegraph-morse.vercel.app/v1/ask -H "Authorization: Bearer morse_YOURKEY" -H "content-type: application/json" -d '{"miner":"livecert","question":"Is the SSL certificate for github.com valid?"}'
```

Free, no key needed — the discovery endpoints and the ledger:

```bash
curl -s https://telegraph-morse.vercel.app/v1/intents
```

```bash
curl -s https://telegraph-morse.vercel.app/v1/leaderboard/SSL_VERIFICATION
```

```bash
curl -s https://telegraph-morse.vercel.app/api/stats
```

### Telegram

**<https://t.me/MyMorse_Bot>** — `/start` shows tappable example questions; answers free text.
Commands: `/miner <slug> <question>`, `/safe`, `/wallet`, `/weather`, `/fact`, `/verify`,
`/stats`.
Every answer carries the same receipt the web and API surfaces return, and lands in the same
public ledger. In a group, Morse answers only when it is @mentioned or replied to, so a busy chat
never pays for answers nobody asked for.

## What a receipt contains

| field | meaning |
| --- | --- |
| `minerSlug`, `minerId` | which miner the Engine routed to |
| `intent` | the canonical intent the router classified the question as |
| `minerRank` | that miner's current leaderboard rank for the intent |
| `routedBy` | `engine` when Telegraph's router chose the miner, `morse` when the fallback did |
| `routerReasoning` | the router's stated reason, or which fallback rule fired |
| `settlementTx` | the USDC transfer on Base Sepolia, from the node's `payment-response` header |
| `confidence` | the miner's own confidence, read from its declared `signal_mapping` — or "not reported" |
| `costUsd`, `durationMs` | what the call cost and how long it took |
| `signalHash` | verify at `/verify/{hash}`, or on the node at `GET /engine/v1/signal/{hash}` |

`/verify/{hash}` shows the node's record, the payer wallet **and whether it is Morse's**, the
node's own `keccak256`-over-payload attestation, and the payload the hash covers. The node does not
publish a per-call settlement transaction (0 of 8 user-paid signals sampled on 2026-09-02 carried
one), so the on-chain trail is the payer wallet's USDC history on BaseScan, which Morse links.

## Run it yourself

```bash
git clone https://github.com/Harshyadav442277/telegraph-morse && cd telegraph-morse && npm ci
```

```bash
npm run typecheck && npm test
```

```bash
cp .env.example .env && npm run dev
```

Without `EVM_PRIVATE_KEY` and a non-zero `DAILY_BUDGET_CALLS`, asking is refused with an honest
message; the site, the ledger and the free discovery endpoints all still work. The end-to-end
judge journey runs against any deployment:

```bash
npm run e2e
```

That suite is free to run. The single paid step is gated behind `MORSE_E2E_PAID=1` so no schedule
can manufacture traffic.

## Docs

- [GO-LIVE.md](GO-LIVE.md) — the operator's runbook for the wallet, the bot and the first paid call
- [PLAN.md](PLAN.md) — claim, reality checks, judging criteria, schedule, tooling
- [PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PHASES.md](PHASES.md)
- [GAPS.md](GAPS.md) — what is missing, broken, or unverified (read before trusting a claim)
- [MEMORY.md](MEMORY.md) — decisions and lessons
- [DEMO.md](DEMO.md) — the judge journey with exact expected output
- [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) — protocol facts, sourced and dated

## Assumptions and limitations

- **Testnet.** Base Sepolia, testnet USDC. Answers are real; the money is not.
- **Telegraph routes first; Morse only falls back.** The network's router gets 20 seconds; if it
  does not answer (it timed out at ~47s for a day on 2026-09-02), Morse classifies the intent with
  keyword rules and calls the best-ranked miner directly. Every receipt and ledger row says which
  of the two happened (GAPS G17).
- **The ledger's early rows are our own verification calls**, not users — real and receipted, but
  not adoption (GAPS G20).
- **"Users" means distinct salted identity hashes** — a Telegram user id, a web session cookie, or
  an API key. One person on two surfaces counts twice; ten people reading one forwarded answer
  count once. Morse publishes the method next to the number and never rounds it up (GAPS G4).
- **The signal hash is shown, not re-derived.** The node states it is `keccak256` over the payload
  and reports `verified: true`; eleven serialisations of the payload as served failed to reproduce
  it, so Morse displays that attestation rather than claiming to have recomputed it (GAPS G3). What
  Morse establishes independently is the **payer**: the wallet on the record, checked against its own.
- **Confidence is heterogeneous.** Miners report it in different shapes or not at all; Morse
  normalises what it can and says "not reported" otherwise (GAPS G8).
- **A direct call to a named miner may not be possible for every miner.** Direct calls are built
  from the miner's manifest and declared input schema, and some miners reject a request they did
  not shape themselves — which fails honestly and costs nothing (GAPS G14, G30).
- **`/proof` depends on a third-party indexer.** It reads Blockscout, which can lag the chain by a
  few blocks or be down; the page then says so and shows the ledger alone. It proves payments, not
  people. Two settlements on chain have no ledger row — calls Morse recorded as timed out that the
  network settled anyway — and are listed rather than removed (GAPS G29).
- **Nothing is written on chain by Morse.** Payments settle on Base Sepolia through x402; Morse
  reads that trail but does not anchor verdicts or run ERC-8183 jobs (GAPS G27).

## License

MIT
