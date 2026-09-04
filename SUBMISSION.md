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
Morse — ask in plain language, get a receipt from the Telegraph network
```

## Description

Two versions. Use the short one if the field is small.

**Short**

```
Morse lets people and agents use Telegraph without a wallet — in Telegram, on the web, or from any MCP client — and turns every answer into evidence. Telegraph's ranked router picks the miner (Morse never does); Morse pays the x402 fee and returns the answer with a receipt: miner and rank, confidence, cost, the USDC settlement on Base Sepolia, and a signal hash anyone can verify on the node. "Ask the podium" has the other top-ranked miners answer the same question and says whether they agree. Every call is in a public ledger, reconciled hash-for-hash against the payer wallet's on-chain settlements at /proof, and every podium round feeds a public per-intent consensus report at /consensus. Not an aggregator: a verification layer on the network's own routing.
```

**Longer, if there is room**

```
Consuming Telegraph today needs a wallet, testnet USDC and an x402 client, which keeps out everyone who is not already a developer with a burner key. Morse removes all three. Ask in Telegram (@MyMorse_Bot), on the web, or from Claude Code, Cursor or any MCP client with one line of config — Morse pays from one app-owned wallet and hands back a receipt: which miner answered and at what leaderboard rank, its own confidence, the cost, the USDC settlement transaction, and a signal hash that resolves on the node.

Every call Morse has ever made is in a public ledger at /#ledger, and every row links to /verify/{hash}, which shows the node's record, the payer wallet checked against Morse's own, and the node's keccak256 attestation. That turns "people used it" into something a judge can check rather than take on trust.

Depth: four recipes fan one question across several intents and combine the receipts; the whole 129-miner catalogue was measured before trusting any of it, which found that four miners publish a *risk* score in the field others use for confidence — read naively, a calm weather forecast looks like an unsure miner. Morse labels those.

Honest limits are in GAPS.md, including the one that matters most: Telegraph's own router goes first with a 20-second budget, and Morse falls back to its own keyword routing only when the router does not answer (it timed out at ~47 s for a day on 2 September, against a 60-second serverless ceiling). Every receipt and ledger row says which of the two happened.
```

---

## Before you submit

- [ ] Post the X updates — 25% of the score is judged on them ([docs/X_TO_POST.md](docs/X_TO_POST.md))
- [ ] Share @MyMorse_Bot so the ledger reflects real people, not our own testing (GAPS G20)
- [ ] `npm run health` returns HEALTHY
- [ ] `MORSE_E2E_PAID=1 npm run e2e` is 7/7 (last run 2026-09-04 10:42 UTC: 7/7 in 27 s)
- [ ] The payer wallet still holds USDC — judging runs Sep 8–18 and a dry wallet mid-judging
      means every demo link fails. Top up at faucet.circle.com before submitting.

## After you submit

Confirm the submission actually shows in the form's list. Screenshot it. A submission you cannot
prove was made is the one failure mode nothing else in this repo protects against.
