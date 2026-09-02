# X_POSTS.md — drafts for @hyadav42774, tagged @Telegraphprotoc

25% of the Track 3 score. One post per real milestone, each with a number or a screenshot that is
true at posting time. Claude drafts; the operator posts. Never post a key, a token, or a `.env`.
Check length before posting (each draft is kept under 280 characters).

## P1 — the idea (post when the bot answers its first stranger)

> Using @Telegraphprotoc today means a wallet, a faucet and an x402 client. Most people stop
> there. So I built Morse: ask in Telegram, get a verified answer from the Telegraph miner
> network, with a receipt you can check on the node and on Base Sepolia. Bot link below.

## P2 — first numbers (post with a screenshot of the ledger)

> Morse day 1: N people asked M questions through @Telegraphprotoc. Every answer names the miner,
> the intent the router chose, its confidence, the cost ($0.01), and a signal hash anyone can
> verify. No wallet needed. Live ledger: <url>

## P3 — developers (post when /mcp is live)

> Telegraph in Claude Code, no wallet: `claude mcp add --transport http morse <url>/mcp`.
> Morse pays the x402 fee, routes through @Telegraphprotoc, and every call lands in a public
> ledger with its receipt. Free key at <url>/keys.

## P4 — a non-obvious finding (post when we have one; candidates)

- how often the router's first pick and the second-ranked miner disagree on `safe <url>`
- how confidence varies across miners serving one intent
- median latency per intent as seen by a real user

## P5 — closing thread (Sep 6-7)

1. What Morse is, in one line, with the ledger screenshot.
2. Users, calls, intents, miners served — the numbers and how to verify them.
3. What surprised us about routing and confidence.
4. What we would build next on Telegraph.
5. Thanks to @Telegraphprotoc; repo link.
