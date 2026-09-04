# SUBMISSION.md — what to paste into the Track 3 form

The form opened between 2026-09-02 15:31 UTC (still "COMING SOON") and 2026-09-03 16:15 UTC.

**<https://submissions.telegraphprotocol.com> → TRACK 3 — GITHUB APP**
**Deadline: Mon, 07 Sep 2026 23:59:59 UTC** (verbatim from the form).

It asks for four things — GitHub repository, title, description, live app URL — and requires a
connected wallet. **Connecting and signing is the operator's job; Claude never touches a wallet.**
Use a wallet you control and will still have access to during judging (Sep 8–18). The Morse burner
is fine, but your main address is safer if the organisers ever need to reach the submitter.

---

## GitHub repository

```
https://github.com/Harshyadav442277/telegraph-morse
```

## Live app URL

```
https://telegraph-morse.vercel.app
```

## Title

```
Morse — Telegraph in Telegram
```

## Description

Two versions. Use the short one if the field is small.

**Short**

```
Telegraph in Telegram. Ask, get an answer from a ranked miner, with a receipt. Morse lets people and agents use Telegraph without a wallet — in the Telegram bot @MyMorse_Bot, on the web, or from any MCP client — by paying the x402 fee itself from one app-owned wallet. Telegraph's ranked router picks the miner; Morse never re-ranks, never checks one miner against another, never blends answers. Every answer comes back with a receipt: miner and rank, confidence, cost, the USDC settlement on Base Sepolia, and a signal hash anyone can verify on the node. Every call is in a public ledger, reconciled hash-for-hash against the payer wallet's on-chain settlements at /proof. Not an aggregator, not a validator: a front door.
```

**Longer, if there is room**

```
Consuming Telegraph today needs a wallet, testnet USDC and an x402 client, which keeps out everyone who is not already a developer with a burner key. Morse removes all three. Ask in Telegram (@MyMorse_Bot), on the web, or from Claude Code, Cursor or any MCP client with one line of config — Morse pays from one app-owned wallet and hands back a receipt: which miner answered and at what leaderboard rank, its own confidence, the cost, the USDC settlement transaction, and a signal hash that resolves on the node.

Every call Morse has ever made is in a public ledger at /#ledger, and every row links to /verify/{hash}, which shows the node's record, the payer wallet checked against Morse's own, and the node's keccak256 attestation. /proof goes further and reconciles the ledger against the payer wallet's USDC transfers read from a public indexer, hash for hash, so "people used it" is something a judge can recompute rather than take on trust.

Depth without duplicating the protocol: four recipes fan one question across several intents and combine the receipts; /miner dispatches straight at one named miner, the same call Telegraph's own reference apps make. The whole 129-miner catalogue was measured before trusting any of it, which found that four miners publish a *risk* score in the field others use for confidence — read naively, a calm weather forecast looks like an unsure miner — and that 22% publish several endpoints without naming the intent each serves. Morse handles both.

On 4 September an organizer said that paying several miners per question to check the ranking is what the protocol already does once for everyone, does not work economically for a user, and reads as spam — and that extending Telegraph into Telegram was the good part. Morse removed its podium, its automatic second opinion and its consensus report the same day, kept their rows in the public ledger rather than rewriting history, and now does one thing.

Honest limits are in GAPS.md, including the one that matters most: Telegraph's own router goes first with a 20-second budget, and Morse falls back to its own keyword routing only when the router does not answer (it timed out at ~47 s for a day on 2 September, against a 60-second serverless ceiling). Every receipt and ledger row says which of the two happened.
```

---

## Before you submit

- [ ] Post the X updates — 25% of the score is judged on them ([docs/X_TO_POST.md](docs/X_TO_POST.md)).
      **The log table in that file is empty. If nothing goes out, a quarter of the score is zero.**
- [ ] Share @MyMorse_Bot so the ledger reflects real people, not our own testing (GAPS G20)
- [ ] `npm run health` returns HEALTHY
- [ ] `MORSE_E2E_PAID=1 npm run e2e` is 7/7 (last run 2026-09-04 15:28 UTC: 7/7 in 22 s)
- [ ] Nothing in the description names the podium, a second opinion or a consensus report —
      they were removed on 2026-09-04 and pitching them is pitching what the organizers rejected
- [ ] The payer wallet still holds USDC — judging runs Sep 8–18 and a dry wallet mid-judging
      means every demo link fails. Top up at faucet.circle.com before submitting.

## After you submit

Confirm the submission actually shows in the form's list. Screenshot it. A submission you cannot
prove was made is the one failure mode nothing else in this repo protects against.
