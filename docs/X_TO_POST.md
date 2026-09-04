# X_TO_POST.md — copy, paste, post, log

The clean version of [X_POSTS.md](X_POSTS.md). That file explains the reasoning; this one is just
the text to copy and a place to record what went out.

All eight fit inside 280 characters as X counts them (a URL counts as 23), checked 2026-09-03.

**Account:** @hyadav42774 · **Always tag @Telegraphprotoc** (hackathon rule 03).
**Before any post with a number in it**, run `npm run x:numbers` and check the figure still holds.

---

## ✅ READY NOW — post these

### 1 · The gap

Number re-checked 2026-09-04 15:51 UTC: **2,142** user-paid calls network-wide in 24 h. Attach a
screenshot of the landing page showing the ledger.

```
Using @Telegraphprotoc needs a wallet, a faucet and an x402 client. So its 2,142 user-paid calls in 24h are almost all developers.

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

### 4 · The endpoint finding

Reframed 2026-09-04: the finding is about calling a *named* miner (`/miner`, `telegraph_ask_miner`),
which is the dispatch Telegraph's own reference apps use. Do not post the old second-opinion
version — that feature is gone (GAPS G32).

```
Calling one @Telegraphprotoc miner by name is harder than it looks.

22% publish more than one endpoint — degenlens-onchain publishes 33 — and only a quarter of those name the intent they serve. Send a fraud question to endpoints[0] and you hit transaction lookup.
```

---

### 5 · The engineering war story — *your call, and the text below is now out of date*

**Do not post as written (checked 2026-09-04).** The last line was true on 2 September and is not
true now: their router recovered, Morse tries it first on every question, and it answers the large
majority of them. Posting "so Morse does its own routing" would misdescribe our own app and the
sponsor's. If you post a war story at all, post the *recovery*:

```
Getting @Telegraphprotoc to take my money took a day.

Their router's settlement call was timing out at ~47s on 2 Sep. A serverless function gets 60.

It's fixed now — Morse asks their router first, and the receipt tells you whether it or my fallback chose the miner.
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

**Do not post until the numbers are strangers'.** Publishing "48 people asked" when most were us is
the metric inflation rule 04 forbids (GAPS G20). Fill from `npm run x:numbers`, and quote **people
answered**, never "who asked". Only the operator knows how many of the 68 identities are strangers;
if the honest answer is "a handful", say the handful.

Numbers at 2026-09-04 15:51 UTC: 48 people answered of 68 who asked · 255 answered calls of 318 ·
20 intents · 44 miners · $2.55 paid. Network-wide user-paid traffic in the same 24 h: 2,142 calls,
of which Morse is ~200 attempted / 171 answered — **about 8%**.

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

**None of the drafted posts has gone out.** Read from @hyadav42774 on 2026-09-04 15:55 UTC, five
posts exist, all written ad hoc:

| Posted | Text, in short | Views | Engagement |
|---|---|---:|---|
| Aug 26 *(pinned)* | A miner can be pure YAML, zero code — `base_url` points at the upstream | **844** | 13 likes, 11 RT, 13 replies |
| Sep 3 | "For testing purpose · Project: Morse Burner · Track 3" + video | 93 | 9 |
| Sep 3 | "Morse Burner is live on versel as well as Telegram bot" | 73 | 4 |
| Sep 3 ~19:50 | "updated vercel deployment and telegram bot for user-friendly interface" | 63 | 4 |
| **Sep 4 ~09:50** | **"New UPDATES!!! in Morse ask podium … get a consensus from them"** | 33 | 1 |

**Read the first row against the rest.** The one post that travelled — 844 views against 33–93 —
was a *finding* someone could use, posted before Morse existed. The four Morse posts are
announcements: no number, no screenshot, no receipt, and a typo in the product's own deployment
name. Posts 1–4 and 6 below are findings. They are still unposted. That is the whole gap.

**And the newest post is now wrong.** It advertises the podium — the feature an organizer rejected
about five hours later, and which was removed the same day. It sits at the top of the timeline the
judges will read. Post the correction below before anything else.

| # | Draft | Date/time (UTC) | Link | Notes |
|---|------|-----------------|------|-------|
| 0 | **Correction — the podium is gone** | | | **post first** |
| 1 | The gap | | | |
| 2 | What a receipt is | | | |
| 3 | Catalogue / risk-vs-confidence | | | |
| 4 | Endpoint finding | | | |
| 5 | War story | | | rewritten; old text is false |
| 6 | Developers / MCP | | | |
| 7 | First real numbers | | | |
| 8 | Closing thread | | | |

---

### 0 · Correction — the podium is gone · **POST THIS FIRST**

The last thing on the timeline promotes a feature that no longer exists and that the organizers
explicitly did not want. Leaving it as the newest post is worse than any missed post. This is also
the strongest post available: it is a finding, it is honest, and it shows the sponsor being
listened to. Two options — the single post is safer, the pair reads better.

```
Correction to my last post: Morse's "ask the podium" is gone.

I asked @Telegraphprotoc whether a miner-checking tool was useful. The answer: their leaderboard already ranks miners, once, for everyone — paying N miners per question to re-check it is spam.

Removed it the same day.
```

Optional second post, quoting the first:

```
What's left is the part they said was good: Telegraph in Telegram.

Ask a question, their router picks the ranked miner, Morse pays the $0.01, you get the answer and a receipt you can verify on-chain.

No wallet. t.me/MyMorse_Bot
```

Do not delete the old post. The correction is worth more with the thing it corrects still visible.

## Assets to have ready

- Landing page screenshot showing the ledger and the six counters
- `/verify/{hash}` cropped to the green **= Morse's payer wallet** line and the BaseScan tx
- A short screen recording: Claude Code tool call → row appearing in the ledger

---

### 9 · Ask the podium — DO NOT POST (retired 2026-09-04 on organizer feedback, GAPS G32; kept as a record)

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
