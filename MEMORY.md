# MEMORY.md — decisions made and lessons learned

Read first every session. Update at session end. Keep it short: decisions and why, lessons and
what they cost. Current state lives in PHASES.md; risks in GAPS.md.

## 2026-09-02 15:30 UTC — HANDOFF STATE (read this first)

**The app is live and serving.** The operator's redeploy landed at ~15:00 UTC and the G13 fix is
confirmed in production: `/`, `/api/stats`, `/api/recent`, `/api/health`, `/keys`, `/v1/intents`,
`/v1/leaderboard/{intent}`, `/verify/{hash}` and `/mcp` all answer. The previous handoff note said
the redeploy was pending — it was not; check the deployment before believing a stale note.

**One blocker, and only Claude cannot fix it** (step-by-step in [GO-LIVE.md](GO-LIVE.md))**:** Vercel production has no `EVM_PRIVATE_KEY` and no
`TELEGRAM_BOT_TOKEN`. So `paidWorkEnabled:false`, `/api/health` returns 503, the ledger reads 0
calls, and 45% of the Track 3 rubric (real users + call volume) is sitting at zero. Everything
downstream of a paid call is built, typechecked and deployed but has **never executed** — GAPS G17.
Operator, in Vercel scope `wukong4`, project `telegraph-morse`:
`npx vercel env add EVM_PRIVATE_KEY production --scope wukong4`, the same for
`TELEGRAM_BOT_TOKEN`, and `TELEGRAM_BOT_USERNAME` (the site renders the t.me link from it), then
`npm run preflight`, then redeploy, then
`curl -X POST https://telegraph-morse.vercel.app/admin/telegram/webhook -H "Authorization: Bearer <ADMIN_TOKEN>"`.

**Deployed and pushed this session.** `main` is at 44d522a on GitHub; production is
`telegraph-morse-qb899uvla` (deployed 15:22 UTC) and serves the new build — `usersAnswered` is in
`/api/stats`, the second-opinion button is in the landing page, `telegraph_second_opinion` is in
the MCP tool list.

**Shipped this session (ccb7c7e, 044d72d, 44d522a):**
- `e2e/judge-journey.spec.ts` + `playwright.config.ts` — the judge journey against production.
  **5 passed, 2 skipped** on 2026-09-02; the skips are the wallet-gated tests and say so. Free to
  run; the single paid step is behind `MORSE_E2E_PAID=1` so no schedule can manufacture traffic.
- Second opinion on every surface: `/second` in Telegram, a button on the web answer card,
  `POST /api/second`, the `telegraph_second_opinion` MCP tool, and the low-confidence threshold now
  firing on web as well as Telegram. Both miners and both ranks are shown. Two new ledger lookups
  (`lastAnswerFor`, `answerByHashPrefix`) back it. 29/29 unit tests.
- `usersAnswered` published next to `users`, so the honest smaller number leads everywhere.
- `scripts/health-probe.mjs` + `.github/workflows/health.yml`; `scripts/x-numbers.mjs`.
- README quick-starts, DEMO.md rewritten with verbatim production output, X drafts with real
  numbers.

**The health alarm is proven end to end.** Run 33648541786 opened issue #1 with the probe output
verbatim; the follow-up run correctly stayed quiet ("Same problems as 2 minutes ago"). That first
run also exposed the flaw it would have caused — 48 "still broken" comments a day on a 30-minute
schedule — now fixed by commenting only when the problem set changes or six hours pass.

**Verified for free this session, worth keeping:**
- **x402 2.24.0 has default spend controls, and they were a live trap.** The client permits only
  assets `findDefaultAsset` recognises, capped at `DEFAULT_MAX_AMOUNT_PER_PAYMENT` = `"$1"`. Base
  Sepolia's USDC `0x036CbD…F7e` *is* in `DEFAULT_ASSETS["eip155:84532"]` and matches
  `USDC_BASE_SEPOLIA`, so our $0.01 calls pass. Had it not matched, the first paid call would have
  failed inside our own client with nothing on the wire to explain it. Read the installed package,
  not the docs — the docs show a `createSigner` that 2.24.0 does not export.
- Network baseline 2026-09-02 15:16 UTC: **878** user-paid Telegraph calls network-wide in 24h,
  **129/129** miners active, **45** canonical intents. SSL_VERIFICATION leaderboard: livecert #1,
  preflight-ssl-verification #2, txlens #3.

**Two real bugs found by reading the catalogue, before any traffic existed:**
- **4 miners publish a risk score in `signal_mapping.confidence_field`** — amanat-weather-risk and
  skywire-storm-alert (`risk`), elcaro-ipi-detection (`risk_score`), vulnfeed-onchain-security
  (`exploit_probability`). Both storm miners do it, so `/weather` would have told a judge
  "confidence 85%" when the miner meant "storm risk 85%", and a calm forecast (risk 0.05) would
  have looked like an unsure miner and fired a second opinion every quiet day. `confidenceIsRisk`
  now labels them and keeps them out of the threshold.
- **`directRequest` used `endpoints[0]`**, but 29 of 129 miners publish several — degenlens-onchain
  publishes 33, and its first is ONCHAIN_TX_LOOKUP, so a FRAUD_DETECTION second opinion went to the
  transaction-lookup endpoint. `endpointFor()` now matches the intent named in the description;
  only 7 of those 29 name intents that way, so the rest still fall back.

`npm run catalogue` re-measures all of it for free. It is also the material for the strongest X
post: a real finding about the network that needs no traffic and no wallet.

**Two findings from reading real signals on the node, free, before we had any of our own:**
- **The node DOES publish the hashing scheme** — a `verification` object nobody had opened:
  `{algorithm: "keccak256", commitment: "payload", verified: true}`, present and true on 8/8
  user-paid signals. Eleven serialisations of the payload as served still failed to reproduce the
  hash (Go struct encoding, most likely), so G3's "show, don't claim to re-derive" stands — but
  `/verify` now shows the attestation, which is real evidence we were throwing away.
- **There is no per-call settlement tx.** `signal.tx_hash` was absent on 8/8. The README, the
  landing page and `/verify` all promised a "USDC settlement transaction on Base Sepolia" that
  would essentially never have rendered — a judge clicking it would have found an empty row. The
  on-chain trail is the payer wallet's USDC history, which we link. Corrected everywhere.
  Meanwhile `signal.wallet_address` was present on 8/8, so the payer match — the actual adoption
  evidence — is sound.
  *(Daemon-generated signals carry neither wallet nor tx; only `source=user` ones do. Sampling a
  daemon signal first made it look like the payer field was broken. Sample user signals.)*

**Two things this session broke and fixed, so they are not re-learned:**
- Repeated e2e runs exhausted the three-keys-per-network-per-day cap, so judge-journey test 4 now
  skips on this machine until 00:00 UTC. The cap works — that is how it was verified live. The
  suite caches its key in `.morse-e2e-key` now. Shared-IP judges could hit the same wall: G18.
- Bash heredocs here still collapse backslashes, so a Python patch script matching on a string
  containing `
` silently fails its assert. Match on a backslash-free substring, or use Write.

**The first paid call is now close to a formality, and there is a script for it.** `npm run
preflight` (scripts/preflight.ts) fetches the node's real 402 challenge *without paying it* and
diffs it against our client: scheme `exact`, network `eip155:84532`, asset `0x036CbD…F7e`, EIP-712
version `2`, $0.01 against the client's $1 cap, 60s against our 45s abort — **all match**, and the
asset is the `DEFAULT_ASSETS` entry so the client's own spend controls permit it. What is left is
only the EIP-3009 signature, the settlement, and the returned hash. Run preflight the moment the
key lands; make the one call only if it prints READY.

**2026-09-02 ~17:55 UTC — the wallet is live and the node still refuses every payment.** Health is
green (payer `0xfBB3…4c9c`, 20 USDC, `paidWorkEnabled:true`, `telegram:true`). Every paid call
returns a bare 402 carrying the original challenge — which Telegraph's docs say is exactly what a
malformed payload looks like, so the wire tells you nothing. Everything checkable has been checked
and is correct: valid recovering EIP-3009 signature, right EIP-712 domain, sane timing, right
`PAYMENT-SIGNATURE` header, client pinned to @x402 2.11.0 and built exactly like Telegraph-MCP
(one-arg signer, wildcard `eip155:*`). The network is healthy — 122 user-paid calls landed while we
failed. No funds moved; balance still 20, nonce still 0. Full list in GAPS G17.
**The next test is `npm run first-call`**, which runs the same client locally and tries the router
then a direct miner: failing there indicts the client, succeeding indicts the serverless runtime.
It needs the key in a local `.env`, so it is the operator's to run.

**Next, in order:** operator sets the two env vars → redeploy → make ONE real paid call and check
`/verify/<hash>` shows the payer = our wallet (closes G17, G2's second half, and the wallet-gated
half of G9) → run `npm run e2e` with `MORSE_E2E_PAID=1` once → X post 1 (ready now, needs no
wallet) → measure G14 on real miners → prove the health alarm fires once (GAPS G16) → freeze
2026-09-05 18:00 UTC.

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
