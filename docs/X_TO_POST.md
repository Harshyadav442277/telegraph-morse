# X_TO_POST.md — what to post, in plain words

Account **@hyadav42774**. Tag **@Telegraphprotoc** in every post (hackathon rule 03).
Before posting any number, run `npm run x:numbers` and check it still holds.

Call it **Morse**. Not "Morse Burner" — the site, the bot and the submission all say Morse.

---

## What actually works here

Numbers, read 2026-09-04 ~16:00 UTC.

| Post | Views |
|---|---:|
| **Your own, 26 Aug — "a miner can be pure YAML, zero code"** | **844** |
| drained99 — how Telegraph works under the hood + his two apps | 234 |
| pawansatoshix — Veridex, "Track 3 is about demand" | 104 |
| Shadrak — Verdikt, "I got rugged last month" | 47 |
| Your four Morse posts (3–4 Sep) | 33–93 |

Your best post beat every rival post by 3.6× to 18×. It was one thing you had learned, said
plainly, that saved someone else two hours. It was not an announcement.

Your Morse posts have been announcements: "live on versel", "user-friendly interface",
"New UPDATES!!!". They get 60 views because nobody needs them.

So: **post what you found out, not what you shipped.** Every draft below is something you learned.

Shadrak's is worth reading for the voice — "I got rugged last month. The chart looked fine, the
vibes were good." Short sentences. A real thing that happened. No adjectives.

---

## 0 · Post this first — the correction

Your newest post sells "ask the podium". An organizer told you five hours later that it was spam,
and it is now deleted from the app. That post is the top of the page a judge will read.

Don't delete the old one. The correction is better with it still there.

```
Correction to my last post. Morse's "ask the podium" is gone.

I asked @Telegraphprotoc whether a miner-checking tool would be useful. They said their leaderboard already ranks miners once, for everyone — paying 3 miners to re-check it is spam.

Fair enough. I deleted it the same day.
```

If you want a second one right after, quoting it:

```
What's left is the bit they said was good: Telegraph inside Telegram.

Type a question. Their router picks the ranked miner. I pay the $0.01. You get the answer and a receipt you can check on-chain.

No wallet, no signup. t.me/MyMorse_Bot
```

---

## 1 · The gap

Attach a screenshot of the landing page with the ledger showing.

```
To ask @Telegraphprotoc anything you need a wallet, faucet money, and code that speaks x402.

Which is why nearly all of its 2,142 paid questions in the last 24h came from developers.

Morse is a Telegram bot. You type the question. I pay the $0.01.

t.me/MyMorse_Bot
```

---

## 2 · What a receipt is

Attach the `/verify` page, cropped so the green "= Morse's payer wallet" line and the BaseScan
link are both visible.

```
Every answer Morse gives you comes with a receipt.

Which miner answered. Its rank. How sure it was. What it cost. The transaction that paid for it.

You don't have to take my word for any of it:
https://telegraph-morse.vercel.app/verify/0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1

@Telegraphprotoc
```

---

## 3 · The one to post if you only post one

Same shape as your 844-view post. A thing you found, that someone else would trip over.

```
I read all 129 @Telegraphprotoc miners before trusting any of them.

73 report a confidence score. 4 of those put a *risk* score in the same field — high means more danger, not more certainty.

Read it wrong and a calm weather forecast looks like a miner that isn't sure. Morse labels those.
```

---

## 4 · Calling one miner by name

```
Asking one @Telegraphprotoc miner directly is harder than it looks.

29 of 129 publish more than one endpoint. degenlens-onchain publishes 33. Most don't say which intent each one serves.

Send a fraud question to the first endpoint and you land on transaction lookup.
```

---

## 5 · The router story — your call

Their router was broken on 2 Sep and works now. Post the recovery, not the complaint. The old
version of this draft said "so Morse does its own routing", which stopped being true on 3 Sep.

```
Getting @Telegraphprotoc to take my money took a day.

On 2 Sep their router needed ~47s just to fail. A serverless function gets 60.

It's fixed now. Morse asks their router first, and the receipt tells you whether it or my fallback picked the miner.
```

---

## 6 · For developers

Post it with a 15-second screen recording: the tool call in Claude Code, then the row appearing in
the ledger.

```
Telegraph in Claude Code. One line, no wallet:

claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp

I pay the x402 fee. 7 tools. Free key at /keys. Every call lands in a public ledger with its receipt.

@Telegraphprotoc
```

---

## 7 · Real numbers — only when they're other people's

At 2026-09-04 15:51 UTC: 48 people answered of 68 who asked · 255 answered calls of 318 · 20
intents · 44 miners · $2.55 paid. Network-wide in the same 24h: 2,142 user-paid calls, of which
Morse is about 8%.

**You are the only one who knows how many of those 68 are strangers.** If it's six, post six.
"48 people" when 40 of them were you is the metric inflation rule 04 forbids, and the ledger is
public, so anyone can check the timestamps. Say **people answered**, never "people who asked".

```
Morse so far: [X] people have had @Telegraphprotoc answer a question for them. [Y] questions, [Z] intents, [W] different miners, $[S] paid to the network.

Every one of those has a hash you can check yourself.

https://telegraph-morse.vercel.app/#ledger
```

---

## 8 · Closing thread — Sep 6 or 7

Six posts, one idea each:

1. What Morse is, one line, ledger screenshot, live link.
2. The final numbers, and how to check any of them.
3. The catalogue finding from post 3, with the final numbers.
4. What you built and then deleted, and why — the organizer's feedback, in their words.
5. What you're not claiming: testnet, "users" means salted identities, the signal hash is shown
   and not re-derived. Link GAPS.md.
6. Thanks to @Telegraphprotoc, repo link.

Post 4 of that thread is the one people will remember. Almost nobody in a hackathon says "I
deleted two days of work because you told me to."

---

## Rules

- One idea per post. If it needs a second paragraph to explain, it's two posts.
- No "!!!", no "pls check out", no hashtag stacks.
- Never post a number you haven't just re-run.
- Never describe a feature that isn't live right now.
- Screenshot or recording on anything that claims something works.

## Assets to have ready

- Landing page screenshot with the ledger and the six counters
- `/verify/{hash}` cropped to the green payer line and the BaseScan link
- 15-second recording: Claude Code tool call → the row appearing in the ledger

---

## Posting log

### Already posted

| When | What | Views | Engagement |
|---|---|---:|---|
| Aug 26 *(pinned)* | Miners can be pure YAML, `base_url` points upstream | **844** | 13 likes, 11 RT, 13 replies |
| Sep 3 | "For testing purpose · Project: Morse Burner · Track 3" + video | 93 | 9 |
| Sep 3 | "Morse Burner is live on versel as well as Telegram bot" | 73 | 4 |
| Sep 3 ~19:50 | "updated vercel deployment and telegram bot" | 63 | 4 |
| Sep 4 ~09:50 | "New UPDATES!!! … ask podium … consensus from them" | 33 | 1 |

### To post

| # | Draft | Posted (UTC) | Link |
|---|------|---|---|
| 0 | Correction — the podium is gone | | |
| 1 | The gap | | |
| 2 | What a receipt is | | |
| 3 | The catalogue finding | | |
| 4 | Calling one miner by name | | |
| 5 | The router story *(optional)* | | |
| 6 | For developers | | |
| 7 | Real numbers | | |
| 8 | Closing thread | | |
