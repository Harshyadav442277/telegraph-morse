# CLAUDE.md — Morse operating rules

**Goal:** win Track 3 of the Telegraph Hackathon Season I. Closes **2026-09-07 23:59 UTC**; resolve
with `date -u`. Rubric: 45% real users + Telegraph call volume, 25% usefulness/depth, 25% X, 5%
technical. Read [PLAN.md](PLAN.md) first, then [MEMORY.md](MEMORY.md), then the top unchecked item
in [PHASES.md](PHASES.md).

## Hard rules

1. **Claude never touches the wallet.** No key creation, no signing, no funding, no pasting keys.
   The operator sets `EVM_PRIVATE_KEY` in Vercel and in their own shell. Never the Track 1 miner
   wallet.
2. **Never commit secrets.** `.env` is gitignored; `.mcp.json` uses `${ENV}` references only.
3. **No mocks, no canned answers** (rule 01). Every answer a user sees is a live engine call made
   for that user, carrying its `signal_hash`.
4. **No artificial traffic** (rule 04). No loops, no unattended calls in the MVP. Every network
   call has a human message, an agent tool call, or an explicit REST call behind it.
5. **Verify protocol facts against live sources**, record them with dates in
   [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md). WebFetch is blocked on telegraphprotocol.com;
   use `curl -4 -A "<browser UA>"` or the browser pane.
6. **Commit messages describe the change and nothing else.** No attribution lines of any kind.
7. Anything unverified goes in [GAPS.md](GAPS.md). Update MEMORY.md, GAPS.md, PHASES.md at session end.

## Useful commands

```bash
date -u                                                     # deadline arithmetic
curl -4 -s https://devnode.telegraphprotocol.com/engine/v1/intents
curl -4 -s "https://devnode.telegraphprotocol.com/api/miners?intent=SSL_VERIFICATION&status=active"
curl -4 -s "https://devnode.telegraphprotocol.com/daemon/api/questions?source=user&since_hours=24&limit=1"
curl -4 -s https://devnode.telegraphprotocol.com/engine/v1/signal/<hash>
```

Prefer deletion to addition. Files under ~300 lines. TypeScript strict, ESM, Node 22.
