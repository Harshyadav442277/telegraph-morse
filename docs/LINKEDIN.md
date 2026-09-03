# LINKEDIN.md — post drafts

Numbers verified 2026-09-03 17:06 UTC with `npm run x:numbers`. Re-run before posting; the ledger
moves.

Two things about LinkedIn specifically:

- **Only the first ~3 lines show** before "…see more". The hook has to earn the click.
- **Links in the post body get less reach** than links in the first comment — LinkedIn favours
  posts that keep people on LinkedIn. You asked for the links in the post, so they are in Draft A.
  Draft B puts them in a first comment instead, which usually travels further. Your call.

Do **not** claim adoption. The 93 answered calls are almost entirely your own testing. Every draft
below says "built it, try it", never "N people are using it".

---

## Draft A — links in the post (as requested)

```
I spent five days building a front door to a decentralised AI network. The hardest part wasn't the AI.

It was getting the network to take my money.

Telegraph is a protocol where independent "miners" answer questions — weather, TLS checks, fraud
scoring, on-chain lookups — and you pay each one a fraction of a cent per call. 129 miners, 45
categories of question, all live.

To use it today you need a crypto wallet, testnet funds from a faucet, and a payment client.
That's a wall most people won't climb.

So I built Morse. Ask a question in Telegram or on the web. No wallet, no signup. Morse works out
which category your question belongs to, calls the best-ranked miner for it, pays the fee from one
shared wallet, and hands you the answer with a receipt:

→ which miner answered, and its rank
→ how confident it said it was
→ what it cost
→ the on-chain transaction that settled it
→ a hash you can verify against the network yourself

That last part is the bit I care about. Anyone can claim usage. Morse publishes every call it has
ever made in an open ledger, and each row links to proof on the network's own node. Claims you can
check beat claims you can't.

Two things I learned the hard way:

1. The network's own router times out after ~47 seconds trying to settle a payment. A serverless
function gets 60. So Morse does its own routing and calls miners directly — about 4 seconds. Every
receipt says which rule chose the miner, so you can judge the routing rather than trust it.

2. I read all 129 miners before trusting any of them. 57% publish a "confidence" number. Four
publish a *risk* score in that same field — where high means more danger, not more certainty. Read
naively, a calm weather forecast looks like an unsure miner. Morse labels those separately.

It's on testnet, so the answers are real and the money isn't.

Try it: https://t.me/MyMorse_Bot
Ledger and live site: https://telegraph-morse.vercel.app

Tell me what breaks.

#AI #Web3 #BuildInPublic #Hackathon
```

---

## Draft B — shorter, links in the first comment

Post this, then immediately comment with the two links.

```
I spent five days building a front door to a decentralised AI network. The hardest part wasn't the AI.

It was getting the network to take my money.

Telegraph is a protocol where independent "miners" answer questions — weather, TLS checks, fraud
scoring, on-chain lookups — and you pay a fraction of a cent per call. 129 miners, 45 categories,
all live. But using it needs a crypto wallet, faucet funds and a payment client. Most people stop
there.

So I built Morse: ask in Telegram or on the web, no wallet, no signup. It picks the best-ranked
miner, pays the fee, and returns the answer with a receipt — which miner, its rank, its confidence,
the cost, the on-chain settlement, and a hash you can verify yourself.

Every call it has ever made is in a public ledger. Anyone can claim usage; I'd rather publish
something you can check.

Two things I learned the hard way:

The network's own router times out after ~47s settling a payment. A serverless function gets 60.
So Morse routes itself and calls miners directly — about 4 seconds.

And I read all 129 miners before trusting any: 57% publish a confidence score, but four publish a
*risk* score in the same field, where high means more danger, not more certainty. Read naively, a
calm forecast looks like an unsure miner.

Testnet, so the answers are real and the money isn't. Links below — tell me what breaks.

#AI #Web3 #BuildInPublic #Hackathon
```

**First comment:**

```
Try it here: https://t.me/MyMorse_Bot
Live site and the open ledger: https://telegraph-morse.vercel.app
Code: https://github.com/Harshyadav442277/telegraph-morse
```

---

## Draft C — short and personal

For when you'd rather not write an essay.

```
Built something for a hackathon this week.

Telegraph is a network of 129 independent AI miners you pay per question — but using it needs a
crypto wallet, faucet funds and a payment client. So I built the part that removes all three.

Ask it anything in Telegram. It picks a miner, pays, and shows you exactly who answered, how
confident they were, what it cost, and a receipt you can verify on-chain.

Every call it has ever made is public: https://telegraph-morse.vercel.app

Try it: https://t.me/MyMorse_Bot

Testnet, so the answers are real and the money isn't. Curious what breaks.
```

---

## What to attach

A screenshot of the ledger at <https://telegraph-morse.vercel.app/#ledger> — the table of calls
with miners, costs and verify links. It carries the whole argument in one image, and LinkedIn
favours posts with an image.

Second best: the `/verify/{hash}` page cropped to the green **"= Morse's payer wallet"** line and
the BaseScan settlement link.

## Before you post

- [ ] Re-run `npm run x:numbers` if you quote any figure
- [ ] Check <https://t.me/MyMorse_Bot> answers a question right now
- [ ] Check the site loads and the ledger has recent rows
- [ ] Do not claim users — the calls so far are yours (GAPS G20)
