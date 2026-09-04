# X_TO_POST.md — what to post, in plain words

Account **@hyadav42774**. Tag **@Telegraphprotoc** in every post (hackathon rule 03).
Every draft below is under 280 characters with URLs counted at 23, so it posts from a free account.

Call it **Morse**. Not "Morse Burner" — the site, the bot and the submission all say Morse.

Numbers in the drafts were re-run **2026-09-04 20:05 UTC**. Before posting any of them:

```bash
npm run x:numbers      # ledger and chain counters
npm run catalogue      # the 129 / 73 / 4 / 29 / 33 figures in posts 5 and 6
curl -4 -s "https://devnode.telegraphprotocol.com/daemon/api/questions?source=user&since_hours=24&limit=1" | grep -o '"total":[0-9]*'   # network 24h calls, post 3
curl -4 -s https://telegraph-morse.vercel.app/api/proof | grep -o '"chainOnly":\[' # then count entries; post 7 and 8 say 6
```

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

---

## Schedule — Sep 4 to Sep 7

Two posts a day, morning and evening UTC, so each gets its own day of feed. Post 0 goes first
whatever the time is; it corrects the post at the top of your profile.

| When | # | Post | Attach |
|---|---|---|---|
| Sep 4, now | 0 | Correction | nothing |
| Sep 4, right after, quoting 0 | 1 | What's left | landing page screenshot |
| Sep 5 morning | 2 | The receipt | `/verify` page cropped to the green payer line and the BaseScan link |
| Sep 5 evening | 5 | The risk-score finding | nothing, or the catalogue script output |
| Sep 6 morning | 4 | For miner authors | 10 s recording of `/miner txlens …` in Telegram |
| Sep 6 midday, in the Discord too | 3 | The gap | ledger screenshot |
| Sep 6 evening | 7 | Proof | `/proof` page with the "on chain, not in the ledger" table |
| Sep 7 morning | 9 | For developers | 15 s recording: Claude Code tool call, then the row appearing in the ledger |
| Sep 7 midday | 8 | The timeout lesson | nothing |
| Sep 7 evening, before the form | T1–T6 | Closing thread | ledger screenshot on T1 |
| only if the strangers' number is worth saying | 10 | Real numbers | ledger screenshot |

Post 6 (one miner by name) is a spare. Use it on Sep 6 if post 4 gets replies from miner authors.

---

## 0 · The correction — post this first

Your newest post sells "ask the podium". An organizer told you five hours later that it was spam,
and it is now deleted from the app. That post is the top of the page a judge will read.

Don't delete the old one. The correction is better with it still there.

```
Correction to my last post. Morse's "ask the podium" is gone.

I asked @Telegraphprotoc if a miner-checking tool would be useful. Their answer: the leaderboard already ranks miners once, for everyone. Paying 3 miners to re-check it is spam.

Fair enough. Deleted the same day.
```

## 1 · What's left — quote post 0

```
What's left is the part they said was good: Telegraph inside Telegram.

Type a question. Their router picks the ranked miner. I pay the $0.01. You get the answer and a receipt you can check on-chain.

No wallet, no sign-up. t.me/MyMorse_Bot @Telegraphprotoc
```

## 2 · The receipt — the one thing Morse should be known for

The hash is a real router-routed call to txlens, #1 for SSL_VERIFICATION, paid by Morse's wallet,
verified 2026-09-04 20:10 UTC. Not a livecert call, on purpose.

```
Every answer Morse gives you comes with a receipt.

Which miner answered. Its rank on the @Telegraphprotoc leaderboard. How sure it was. What it cost. The transaction that paid for it.

You don't have to take my word for any of it:
https://telegraph-morse.vercel.app/verify/0xa93d4e871ca5baf89dfb5b5ce62aee0d701021ae97634fcc87d94cc2cf0754ce
```

## 3 · The gap

The 2,406 is the Daemon's `total` for `source=user&since_hours=24`. The "one wallet paid a third"
comes from looking up 120 evenly spaced signal hashes from that feed and reading
`signal.wallet_address`; one payer was 39 of 120. Re-run both before posting; the number moves.

```
To ask @Telegraphprotoc anything you need a wallet, faucet money and code that speaks x402.

So its 2,406 paid questions in the last 24h came from scripts. In a sample of 120, one wallet paid a third.

Morse is a Telegram bot. You type, I pay the cent. t.me/MyMorse_Bot
```

## 4 · For miner authors — the distribution post

This is the one to also paste into the hackathon Discord, in the Track 1 channel. Every miner
author has a reason to try it once, and each try is a real call through the node.

```
If you run a @Telegraphprotoc miner, call it from Telegram without a wallet:

/miner yourslug <question> in t.me/MyMorse_Bot

It goes through the node, I pay the cent, and you get the rank, the confidence and the receipt. If it fails, it's free and the reply says why.
```

## 5 · The risk-score finding — the one to post if you only post one

Same shape as your 844-view post. A thing you found, that someone else would trip over.
`npm run catalogue` prints the figures; the four miners are amanat-weather-risk,
skywire-storm-alert, elcaro-ipi-detection and vulnfeed-onchain-security.

```
I read all 129 @Telegraphprotoc miners before trusting any of them.

73 report a confidence score. 4 of those put a *risk* score in the same field: high means more danger, not more certainty.

Read it wrong and a calm forecast looks like an unsure miner. Morse labels those.
```

## 6 · One miner by name — spare

```
Asking one @Telegraphprotoc miner directly is harder than it looks.

29 of 129 publish more than one endpoint; one has 33. Most don't say which intent each serves.

Send a fraud question to the first endpoint and you get a transaction lookup. Morse reads the manifest first.
```

## 7 · Proof

```
Hackathon rule 04: no inflated metrics. So I made Morse's usage checkable.

/proof reads my wallet's USDC transfers from a block explorer and matches them, hash for hash, against the public ledger.

The 6 payments my ledger lacks are listed, not hidden. @Telegraphprotoc
```

## 8 · The timeout lesson

Behind it: GAPS G29 and G33. Failed calls are free on 2xx-only settlement; a timeout is not a
known outcome, so the node can settle after Morse stops waiting. Morse now moves to the next
miner on a 5xx or a refused payment, and never after a timeout.

```
Something I learned paying @Telegraphprotoc miners: a timeout isn't free.

A failed call costs nothing. But if I stop waiting at 20s, the node can still settle afterwards. Six of my payments bought answers nobody received.

So Morse retries on an error and never on a timeout.
```

## 9 · For developers

Their MCP (`telegraph-protocol-mcp` on npm) pays from `TELEGRAPH_EVM_PRIVATE_KEY`; that is the
whole difference, so say it once. The full `claude mcp add` command with the bearer header is on
the site; it does not fit in a post with the rest.

```
Telegraph in Claude Code or Cursor, no wallet.

One command adds Morse as an MCP server. I pay the x402 fee; you get a free key with a daily cap. Every call lands in the public ledger with a receipt.

@Telegraphprotoc's own MCP needs a funded key. This one doesn't.
```

## 10 · Real numbers — only when they're other people's

**You are the only one who knows how many identities are strangers.** If it's six, post six.
"50 people" when 40 of them were you is the metric inflation rule 04 forbids, and the ledger is
public, so anyone can check the timestamps. Say **people answered**, never "people who asked".
If the strangers' number is embarrassing, skip this post; the thread's T2 gives call counts, which
are real whoever made them.

```
Morse so far: [X] people have had @Telegraphprotoc answer a question for them. [Y] answered calls, [Z] intents, [W] different miners, $[S] paid to the network.

Every one of those has a hash you can check yourself.

telegraph-morse.vercel.app/#ledger
```

---

## Closing thread — Sep 7, before you submit

Six posts, one idea each, as replies to T1. T3 is the one people will remember: almost nobody in
a hackathon says "I deleted two days of work because you told me to."

**T1**
```
Morse, for @Telegraphprotoc Track 3, in one line: Telegraph inside Telegram.

Type a question, their router picks the ranked miner, I pay the cent, you get the answer with a receipt you can check on-chain. No wallet.

t.me/MyMorse_Bot

A short thread on what I learned.
```

**T2** — fill from `npm run x:numbers` the minute before
```
Final numbers, [date] UTC: [Y] answered calls across [Z] intents and [W] miners, $[S] paid to the @Telegraphprotoc network.

Every one has a signal hash and a settlement tx. Check any: telegraph-morse.vercel.app/#ledger

/proof matches them against the chain and lists the ones that don't.
```

**T3**
```
What I built and then deleted.

A podium that paid three ranked miners per question, and a consensus report. An organizer said: the leaderboard ranks them once, for everyone; paying N miners to re-check is spam.

They were right. Gone the same day. @Telegraphprotoc
```

**T4**
```
What I'm not claiming, @Telegraphprotoc.

Testnet: real answers, fake money. "Users" are salted identity hashes; most so far are me testing. The signal hash is shown, not re-derived. One miner the router often picks is mine; I neither skip nor favour it.

github.com/Harshyadav442277/telegraph-morse/blob/main/GAPS.md
```

**T5**
```
The one thing I'd tell the next person building on @Telegraphprotoc: ask the organizers what they want before building anything that sits between a user and their protocol's judgement.

It cost me two days. The Telegram bot was the part they liked, and it's the part that's left.
```

**T6**
```
Thanks @Telegraphprotoc. Source, tests and the limits ledger: github.com/Harshyadav442277/telegraph-morse

The bot: t.me/MyMorse_Bot
```

---

## Rules

- One idea per post. If it needs a second paragraph to explain, it's two posts.
- No "!!!", no "pls check out", no hashtag stacks.
- Never post a number you haven't just re-run.
- Never describe a feature that isn't live right now. Nothing here names the podium as a feature,
  a second opinion, a consensus report, recipes, or the discovery tools.
- Screenshot or recording on anything that claims something works.
- Reply to every reply within the day. Replies are the "meaningful engagement" the rubric names.

## Assets to have ready

- Landing page screenshot with the ledger and the six counters
- `/verify/0xa93d4e87…` cropped to the green payer line and the BaseScan link
- `/proof` with the "On chain, not in the ledger" table visible
- 10 s recording: `/miner txlens Is the certificate for github.com valid?` in Telegram
- 15 s recording: Claude Code tool call, then the row appearing in the ledger

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
| 0 | Correction | | |
| 1 | What's left | | |
| 2 | The receipt | | |
| 5 | The risk-score finding | | |
| 4 | For miner authors | | |
| 3 | The gap | | |
| 7 | Proof | | |
| 9 | For developers | | |
| 8 | The timeout lesson | | |
| 6 | One miner by name *(spare)* | | |
| 10 | Real numbers *(only if strangers')* | | |
| T1–T6 | Closing thread | | |
