# X_TO_POST.md — copy, paste, post, log

The clean version of [X_POSTS.md](X_POSTS.md). That file explains the reasoning; this one is just
the text to copy and a place to record what went out.

All eight fit inside 280 characters as X counts them (a URL counts as 23), checked 2026-09-03.

**Account:** @hyadav42774 · **Always tag @Telegraphprotoc** (hackathon rule 03).
**Before any post with a number in it**, run `npm run x:numbers` and check the figure still holds.

---

## ✅ READY NOW — post these

### 1 · The gap

Numbers verified 2026-09-03 05:15 UTC. Attach a screenshot of the landing page showing the ledger.

```
Using @Telegraphprotoc needs a wallet, a faucet and an x402 client. So its 1,133 user-paid calls in 24h are almost all developers.

Morse is the front door: ask in plain language, Morse pays, and you get a receipt you can verify on-chain.

https://telegraph-morse.vercel.app
```

---

### 2 · What a receipt is

Attach the `/verify` page cropped to **Paid by … = Morse's payer wallet** and the BaseScan link.

```
Every Morse answer names the miner that served it, its rank for that intent, its own confidence, what it cost, and the on-chain settlement.

LiveCert #1 for SSL_VERIFICATION, 100% confident, $0.01, ~1s.

Check it yourself: https://telegraph-morse.vercel.app/verify/0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1
```

---

### 3 · The depth post — what the catalogue says

The strongest post in the set. It is a real finding, it shows depth rather than a feature list, and
it is honest about a trap. Needs no wallet and no traffic.

```
I read all 129 @Telegraphprotoc miners before trusting any of them.

57% publish a confidence field. 4 publish a *risk* score in it — high means more danger, not more certainty. Read naively, a calm forecast looks like an unsure miner.

Morse labels those as risk.
```

---

### 4 · The second-opinion finding

```
Asking a second @Telegraphprotoc miner is harder than it looks.

22% publish more than one endpoint — degenlens-onchain publishes 33 — and only a quarter of those name the intent they serve. Send a fraud question to endpoints[0] and you hit transaction lookup.
```

---

### 5 · The engineering war story — *your call*

Factual and not unkind, but it names a rough edge in the sponsor's product. Engineers reshare this
kind of post. Post it only if you're comfortable with that.

```
Getting @Telegraphprotoc to take my money took a day.

Their router's settlement call times out at ~47s. A serverless function gets 60.

So Morse does its own routing — picks the intent, calls the #1 ranked miner directly. ~4s, and the receipt tells you which rule chose it.
```

---

## ⏸ HOLD — not honest yet

### 6 · Developers, no wallet

Post once the MCP endpoint has answered a **paid** call. Attach a 15-second screen recording of the
tool call in Claude Code, then the row appearing in the ledger.

```
Telegraph in Claude Code, no wallet, one line:

claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp

Morse pays the x402 fee, routes through @Telegraphprotoc, and every call lands in a public ledger with its receipt. 7 tools, free key at /keys.
```

### 7 · First real numbers

**Do not post until the numbers are strangers'.** Every ledger row right now is our own verification
traffic (GAPS G20) — publishing "15 people asked" when all 15 were us is the metric inflation rule
04 forbids. Fill from `npm run x:numbers`, and quote **people answered**, never "who asked".

```
Morse, day N on @Telegraphprotoc: [X] people asked [Y] questions across [Z] intents and [W] miners, for $[S] paid to the network.

Not a dashboard number — every row has a signal hash you can check yourself.

https://telegraph-morse.vercel.app/#ledger
```

### 8 · Closing thread — Sep 6–7

1. What Morse is, one line, ledger screenshot, live link.
2. The final numbers, and one sentence on how to verify any of them.
3. The catalogue finding from post 3, restated with final numbers.
4. What Morse deliberately does **not** claim: testnet, "users" = salted identities, the signal
   hash is shown not re-derived. Link GAPS.md.
5. What we'd build next: ERC-8183 anchoring, streaming over the WebSocket.
6. Thanks to @Telegraphprotoc; repo link.

---

## Posting log

Fill this in as you go — the closing thread and the submission both need the links.

| # | Post | Date/time (UTC) | Link | Notes |
|---|------|-----------------|------|-------|
| 1 | The gap | | | |
| 2 | What a receipt is | | | |
| 3 | Catalogue / risk-vs-confidence | | | |
| 4 | Second-opinion finding | | | |
| 5 | War story (optional) | | | |
| 6 | Developers / MCP | | | |
| 7 | First real numbers | | | |
| 8 | Closing thread | | | |

## Assets to have ready

- Landing page screenshot showing the ledger and the six counters
- `/verify/{hash}` cropped to the green **= Morse's payer wallet** line and the BaseScan tx
- A short screen recording: Claude Code tool call → row appearing in the ledger

---

### 9 · Ask the podium (READY — verified live 2026-09-04)

Attach a screenshot of the podium panel showing "3 of 3 miners agree: valid" with the three receipts.

```
New in Morse: Ask the podium.

@Telegraphprotoc routes your question to one ranked miner. One click, and the other top-ranked miners answer the same question — side by side, with ranks and receipts.

github.com's TLS cert: #1, #2 and #3 all say valid. 5.6 s, $0.02.
```

And when it cannot judge, it says so:

```
Podium is only honest if it refuses to guess.

BTC price: the #1 miner said $81,019. #2 could not be addressed, #3 said "data unavailable", #4 timed out. Morse's verdict: "cannot be judged" — every attempt is in the public ledger.

@Telegraphprotoc
```
