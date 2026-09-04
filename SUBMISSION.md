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

Written 2026-09-04 20:05 UTC against the live site, `/api/stats`, `/api/proof`, `npm test` and
`src/channels/telegram.ts`. Every claim in it is checkable at the live URL. It is built around the
three things Morse adds that Telegraph does not already have (a wallet-free way in, the receipt,
auditable usage) and names nothing that duplicates the explorer, the router or Telegraph's own MCP.
Before pasting, re-run `npm run x:numbers` and refresh the one dated sentence of numbers; nothing
else should need to change.

```
Telegraph is a network of independent answer services ("miners") that compete on a public leaderboard: weather, crypto prices, is this link safe, is this certificate valid, fact checks, translation. Until now you needed a crypto wallet, faucet USDC and an x402 client to ask it anything. Morse puts Telegraph inside Telegram. Type a question to @MyMorse_Bot, Telegraph's own router picks the ranked miner, Morse pays the $0.01 fee from its own wallet, and the answer comes back with a receipt. No wallet, no key, no sign-up. Add the bot to a group and it answers only when mentioned or replied to, so a busy chat never pays for answers nobody asked for.

Three things Morse adds to Telegraph, and nothing else:

1. A wallet-free way in. Telegram for people. For agents, the same call as one hosted MCP URL (one command in Claude Code or Cursor) or one REST endpoint, with a free key that carries a daily cap. Telegraph's own MCP server needs a funded private key; Morse's needs nothing.

2. A receipt on every answer. Which miner answered and its leaderboard rank for that intent, who routed the question, the miner's own confidence or "not reported", the cost, the latency, the USDC settlement transaction on Base Sepolia, and the signal hash. /verify/{hash} fetches the node's own record and checks that the paying wallet is Morse's.

3. Usage you can audit. Every call Morse has ever made, including the developer's own testing, is in a public ledger at /#ledger. /proof reads the payer wallet's USDC transfers from a public block explorer and matches them against the ledger's settlement hashes; any payment on chain with no ledger row is listed, not hidden. Live counters: /api/stats and /api/proof. At 4 Sep 20:00 UTC: 323 calls, 260 answered, 20 intents, 45 miners paid, $2.60, 266 settlements on chain. Read them with the caveat in the repo's GAPS.md: most identities so far are the developer's own, and "users" means salted identity hashes, not verified people.

What Morse deliberately does not do. It does not re-rank miners, does not blend answers, and does not check one miner against another. Telegraph's leaderboard decides that once, for everyone, and the router's pick is the answer. Morse falls back to its own routing only if the router has not answered in 20 seconds, and every receipt says which happened. When you want a specific miner, name it (/miner <slug> in Telegram, a miner field on REST and MCP) and the receipt says routing was bypassed at your request. Two earlier features that paid several miners per question were removed on 4 Sep after an organizer said Telegraph already does that ranking once for everyone; their ledger rows stay, labelled.

Stated limits. Testnet only. Morse reads the chain and writes nothing to it. The signal hash is shown with the node's own keccak256 attestation, not re-derived. One miner the router often picks, livecert, is run by the same person who built Morse; it holds its ranks on the public leaderboard, Morse neither skips nor favours it, and every ledger row names the miner it went to. Source, tests and an honest limits ledger: github.com/Harshyadav442277/telegraph-morse
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
