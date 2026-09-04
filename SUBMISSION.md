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

Written 2026-09-04 17:15 UTC against the live site, `/api/stats`, `/api/proof` and `npm test`.
Every claim in it is checkable at the live URL. Before pasting, re-run `npm run x:numbers` and
refresh the one dated sentence of numbers; nothing else should need to change.

```
Telegraph is a marketplace where independently run APIs ("miners") answer questions, validators rank them per intent, and every answer is paid per call over x402. Using it today takes a wallet, faucet USDC and an x402 client. Morse removes all three: it holds one funded payer wallet, pays the fee, and hands back the answer with a receipt. It runs as a Telegram bot (@MyMorse_Bot), a web page, a hosted MCP server and a REST endpoint. No wallet, no key, no sign-up.

How a question travels. It goes to Telegraph's own router, which classifies the intent and picks a ranked miner. Morse falls back to its own keyword routing only if the router does not answer within 20 seconds, and every receipt says which of the two happened. Morse does not re-rank miners, does not blend answers and does not check one miner against another. Telegraph's leaderboard already decides that once, for everyone; the router's pick is the answer. When you want a specific miner, name it (/miner <slug> in Telegram, a miner field on REST and MCP) and the receipt says routing was bypassed at your request.

What a receipt contains. The miner and its leaderboard rank for the intent, who routed the question, the miner's own confidence (or "not reported"), the cost, the latency, the USDC settlement transaction on Base Sepolia, and the signal hash. /verify/{hash} fetches the node's record for that hash, shows the wallet that paid and checks it is Morse's.

Evidence rather than claims. Every call Morse has ever made, including the developer's own testing, is in a public ledger at /#ledger. /proof reads the payer wallet's USDC transfers from a public block explorer and matches them against the ledger's settlement hashes; the on-chain payments that have no ledger row are listed, not hidden. Live counters are at /api/stats and /api/proof. As of 4 Sep 17:15 UTC: 322 calls, 259 answered, 20 intents, 45 miners, $2.59 paid, 265 settlements on chain. Read those with the caveat the repo's GAPS.md states: most identities in the ledger so far are the developer's own, and "users" means salted identity hashes, not verified people.

For agents. One command adds Morse to Claude Code or Cursor as an MCP server; a free key from /keys carries a daily cap so no single caller can drain the wallet. The same call is available over REST.

Stated limits. Testnet only. Morse reads the chain but writes nothing to it. The signal hash is shown with the node's own keccak256 attestation, not re-derived. One miner the router often picks, livecert, is run by the same person who built Morse; it holds its ranks on the public leaderboard, Morse neither skips nor favours it, and every ledger row names the miner it went to. Two features that paid several miners per question were removed on 4 Sep after an organizer said Telegraph already does that ranking once for everyone; their ledger rows stay, labelled. Source, 72 unit tests and a paid end-to-end judge journey: github.com/Harshyadav442277/telegraph-morse
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
