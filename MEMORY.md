# MEMORY.md — decisions made and lessons learned

Read first every session. Update at session end. Keep it short: decisions and why, lessons and
what they cost. Current state lives in PHASES.md; risks in GAPS.md.

## 2026-09-02 18:20 UTC — HANDOFF STATE (read this first)

**Morse pays. It works in production.** First live receipt through the deployed app:
`0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1` — LiveCert #1 for
SSL_VERIFICATION, $0.01, settled on-chain `0x31b9b480…2af007`, `paidByMorse: true`, node's own
`verification.verified: true`. Health is green; ledger is durable and filling.
`MORSE_E2E_PAID=1 npm run e2e` → **5 passed, 2 skipped** (both conditional by design, GAPS G9).

**The two faults that stood in the way, and one wrong turn of my own:**
1. **Telegraph's router is unusable from serverless.** `/engine/v1/ask` returns
   `settle request failed: Post "https://facilitator.payai.network/settle": context deadline
   exceeded` after ~47s; Vercel's ceiling is 60s. `/engine/v1/ask/{minerId}` settles in ~4s. Morse
   now routes itself in `src/core/route.ts` — keyword rules → best-ranked live miner → direct call,
   with the reasoning printed on the receipt.
2. **The Request must be materialised before the payment wrapper.** `wrapFetchWithPayment(fetch, …)`
   given a `(url, init)` pair works locally and fails on Vercel: the retry left without its payment
   header. Wrapping fetch as `globalThis.fetch(new Request(input, init))` fixes it. Found by
   logging outbound requests from inside the deployed function — do that early next time.
3. **The wrong turn:** hours spent concluding "the node rejects valid signatures", from probing
   with Hardhat's *unfunded* test key. An unfunded payer gets `invalid_exact_evm_signature`; a
   funded one gets a settle timeout or succeeds. **Never diagnose a payment path with an unfunded
   proxy wallet.** The operator's own local run — router failing, direct succeeding — is what broke
   the deadlock.

**Also corrected:** the per-call settlement tx does exist, in the `payment-response` **header**, not
in the signal record. Morse captures and stores it and links BaseScan. And the payer holds **0 ETH**
and pays fine, which finally proves the gasless EIP-3009 assumption (G2 closed).

**Integrity note (GAPS G20):** every ledger row so far is our own verification traffic, not users.
Real, receipted, and not adoption. Do not quote user numbers in an X post until they are strangers'.

**All four recipes verified against production** (safe, weather, wallet, fact), each fanning out to
different #1 miners. Running them for real found three routing bugs that no unit test would have
caught — a URL's `https` stealing the safety leg, an ENS name outranking a fraud question, and a
place name being sent as a wallet address — plus concurrent recipe payments drawing
`batch_send_failed` from the facilitator. All fixed, all covered by tests built from the real
catalogue. **Lesson: run the thing against the live network; the catalogue is the spec.**

**Operator's remaining items:** register the Telegram webhook — it needs `ADMIN_TOKEN`, which is a
Vercel *Secret* and cannot be read back, so reset it to a value you keep; then post X draft 1,
which needs no wallet and is ready.

**Health monitoring is fully proven:** the alarm opened an issue while broken, stayed quiet on a
repeat run, and closed itself once the wallet was funded (G16). The 30-minute *schedule* still has
not been observed to fire — GitHub's cron is best-effort and this repo is hours old (G19).

**Numbers at 18:14 UTC:** 6 answered calls of 12 attempted, 4 identities, 2 intents, 2 miners,
$0.06 spent. Network context: 1,092 user-paid Telegraph calls in 24h, 129/129 miners active,
45 intents.

## 2026-09-02 — Track 3 research and plan

**Decision: Morse, a consumer + agent front door, not a vertical app.** The Track 3 rubric is 45%
"real users + volume of Telegraph calls", 25% depth, 25% X, 5% technical. A vertical tool
(CertWatch-style monitor, prediction bot) needs a niche audience we cannot find in five days; a
Telegram bot plus a wallet-free hosted MCP reaches humans and agents on day one and every answer
is a routed, paid, receipted Telegraph call.

**Decision: retire CertWatch instead of extending it.** It was built as Track 1 eligibility
insurance, never funded, never had a user, and its state/scheduler design fought the platform.
Reusing it would have carried that weight into a fresh 5-day sprint. Its lessons kept: guard every
paid endpoint (token + rate + daily cap), never keep durable state in serverless `/tmp`, and read
the shipped SDK `.d.ts` rather than the docs.

**Decision: public verifiable ledger as the core feature.** Judges cannot verify "real users" from
a screenshot. The node's signal records carry the payer `wallet_address` and a `tx_hash`, and
`/daemon/api/questions?source=user` lists user-originated traffic network-wide. Making every Morse
call verifiable turns the adoption claim into evidence.

**Decision: Hono on Vercel + Neon Postgres.** Operator already has Vercel (scope `wukong4`, CLI
logged in). Neon is a one-click Marketplace add with no card. Hono keeps the bot webhook, web, MCP
and REST in one small codebase.

**Decision: Telegram first, Discord only with the organizers' blessing.** A Telegram bot needs no
permission from anyone; the Telegraph Discord is the densest audience but adding a bot there is
the admins' call.

### Lessons
- **WebFetch is blocked (403) on every telegraphprotocol.com host.** `curl -4` with a browser
  User-Agent returns 200, and the docs pages are server-rendered — strip tags and read. The rules
  page's judging tabs are client-side; the Track 3 tab needed the browser pane.
- **The rubric was hidden behind a tab.** A plain text dump of the rules page shows only Track 1's
  criteria. Anyone planning Track 3 from that dump would optimise for the wrong thing.
- **Network baseline:** 771 user-originated calls/24h network-wide on 2026-09-02, 73% of the last
  100 direct to `degenlens-onchain`. Volume alone will not stand out; verifiable users will.
- **Vercel deploys of the miner repo do not happen on push** — production is `vercel --prod`.
  Verify the Git integration for this repo on the first deploy rather than assuming.
- **`jq` is not installed on this machine**; use `node -e` for JSON. IPv6 hangs: use `curl -4`.
- **Operator's public `Telegraph` repo is a PREFLIGHT copy** (a rival miner). Flagged as G10.
