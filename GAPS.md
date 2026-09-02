# GAPS.md — what is missing, broken, or unverified

Honesty ledger. Anything unverified lives here rather than being rounded to "fine". Feeds the
README's limitations section.

### G1 · Vercel function duration vs miner latency — `MEASURED 2026-09-02`
Real paid calls through the deployment complete in **200 ms – 4 s**, far inside the 60s ceiling —
because Morse calls miners directly. The router would have blown it: `/engine/v1/ask` takes ~47s
just to fail on settlement (G17). The original concern was right, and the answer was to stop using
the router.
The Telegram path still acks the webhook and finishes in `waitUntil` with `maxDuration: 60`, which
remains the right shape for a slow miner.

### G2 · x402 SDK 2.24.0 — `CLOSED 2026-09-02`
**Verified against the installed 2.24.0 packages, not the docs:** `toClientEvmSigner` and
`ExactEvmScheme` are live exports of `@x402/evm`, `wrapFetchWithPaymentFromConfig` of `@x402/fetch`,
and its config type is `{schemes: SchemeRegistration[]}` with `SchemeRegistration = {network,
client, …}` — exactly the call `payingFetch()` makes.

**Also verified, and it was a live trap:** the client applies *default spend controls* — only
assets `findDefaultAsset` recognises, capped at `DEFAULT_MAX_AMOUNT_PER_PAYMENT` = **$1**. Base
Sepolia (`eip155:84532`) is in `DEFAULT_ASSETS` with USDC
`0x036CbD53842c5426634e7929541eC2318f3dCF7e`, the same address `USDC_BASE_SEPOLIA` uses, and
Telegraph calls cost $0.01–$0.015. So the defaults permit our payments and no `spendControls`
override is needed. Had the asset not matched, the first paid call would have failed inside our own
client with nothing on the wire to explain it.

**Gasless payer CONFIRMED 2026-09-02:** the payer wallet holds **0 ETH** and has nonce 0, and it
has settled real payments on-chain. The facilitator submits the EIP-3009 transfer and pays the gas,
exactly as designed. G2 is closed.

### G3 · Signal hash derivation — `SHARPENED 2026-09-02; still not re-derived`
The node **does** publish the scheme, in a `verification` object nobody had looked at:
`{algorithm: "keccak256", commitment: "payload", verified: true}` — present and true on 8 of 8
user-paid signals sampled.

Eleven serialisations of the payload exactly as served (`JSON.stringify`, sorted keys, the raw
substring lifted from the response body, pretty-printed, request-only, response-only, request+
response, payload-minus-timestamp, a pipe-joined field concatenation, the result object, the signal
object) all produced a different hash. The node most likely hashes a canonical Go struct encoding
that differs from the JSON it serves. So: `/verify` now **shows** the node's attestation and says
plainly that Morse did not reproduce it. Do not claim "re-derived" unless it is.

**What Morse does establish independently** is the payer: `signal.wallet_address` was present on
8/8 user-paid signals and is compared against Morse's own wallet. That is the adoption evidence,
and it does not depend on the hashing scheme.

### G4 · "Real users" is our count of hashed identities — `DISCLOSED 2026-09-02, still an approximation`
Telegram user ids, web session cookies and API keys are counted distinct after salting. One
person on two surfaces counts twice; a group of ten forwarding one answer counts once. Publish the
method next to the number. Never inflate; when in doubt, undercount.
**Sharpened 2026-09-02:** `/api/stats` now returns two numbers — `users` (identities that asked at
all, failures included) and `usersAnswered` (identities that actually got an answer). The site,
the Telegram `/stats` command and the X drafts lead with the smaller one. The approximation in the
paragraph above is unchanged and stays disclosed.

### G5 · Track 3 submission form unknown — `OPEN, re-checked 2026-09-02 15:31 UTC`
submissions.telegraphprotocol.com still shows "TRACK 3 — COMING SOON" and the tab's button is
`disabled: true` in the DOM, so nothing is hidden behind it. Field list unknown. Keep ready: repo
URL, live URL, X handle, payer wallet address, short description, gif. Check daily.

Noted on the same page: **Track 1 submissions are CLOSED**, deadline shown as
"Wed, 02 Sep 2026 11:59:59 UTC" — a *submission* deadline distinct from the Aug 31 track window in
the miner repo's CLAUDE.md. That concerns the other repo, not Morse; flagging it, not acting on it.

### G6 · Exact Track 3 deadline — `OPEN`
The rules site's countdown says Sep 7 23:59 UTC. The exact wording is posted in Discord
`#announcements`; the operator should transcribe it into docs/TELEGRAPH_FACTS.md.

### G7 · Faucet cadence — `OPEN`
Circle's faucet: 20 USDC per 2h per address per chain (web sources, 2026-09-02). At $0.01/call that
is 2,000 calls per claim; the demand multiplier raises price to $0.015 above 1,000 requests/24h
per intent. The stats page shows the payer balance so a dry wallet is visible before it hurts.

### G8 · Confidence is heterogeneous across miners — `MEASURED 2026-09-02, one real bug fixed`
Measured over all 129 active miners with `npm run catalogue`:

- **73 (57%) declare a `confidence_field`; 56 (43%) declare nothing at all.**
- 9 distinct field names: `confidence` ×64, then `risk` ×2, `risk_score`, `exploit_probability`,
  `answer`, `match`, `probability`, `yield_quality.yield_quality_score`,
  `capabilityIntelligence.confidence`.
- **4 miners map a *risk* score into `confidence_field`** — amanat-weather-risk (`risk`),
  skywire-storm-alert (`risk`), elcaro-ipi-detection (`risk_score`), vulnfeed-onchain-security
  (`exploit_probability`). A high number there means *more danger*, not *more certainty*.

That last one was a live bug, not a curiosity: both storm miners do it, so the `/weather` recipe —
which asks STORM_ALERT — would have shown a judge "confidence 85%" when the miner meant "storm risk
85%", and a calm forecast (`risk: 0.05`) would have looked like a 5%-confident miner and fired a
spurious second opinion on every quiet day. Fixed: `Receipt.confidenceIsRisk` labels these as risk
everywhere they are rendered and excludes them from the second-opinion threshold. Covered by
test/catalogue-quirks.test.ts.

Still open: what miners put in these fields at *runtime* (strings, 0-100, nulls) can only be seen
with real traffic.

### G9 · End-to-end coverage — `CLOSED 2026-09-02 18:14 UTC`
`MORSE_E2E_PAID=1 npm run e2e` against production: **5 passed, 2 skipped**. Both of the previously
wallet-gated tests now pass — test 3 (every signal hash in the ledger verifies on the node and was
paid by Morse's wallet) and test 7 (ask → receipt → verify → ledger row, with a real $0.01 call).

The two skips are conditional by design, not gaps: test 6 only runs when the wallet is *unfunded*
(it asserts the honest-failure path), and test 4 skipped because this machine's network had already
spent its three API keys for the UTC day (GAPS G18) — it passed earlier the same day against the
same deployment.

### G10 · The operator's public repo `Harshyadav442277/Telegraph` is a copy of a rival's miner — `OPEN, operator decision`
Found 2026-09-02: that repo's README and package.json are PREFLIGHT (`preflight-ssl-verification`,
a Track 1 competitor whose source is public at github.com/shreshth006/Preflight), last pushed
2026-08-28. Judges browse profiles. Options: delete it, make it private, or add a README line
stating it is a study fork with attribution. Not Claude's call; nothing in this repo depends on it.

### G11 · Rule 04 exposure of any scheduled traffic — `ACCEPTED by design`
Watches are stretch-only, capped, labelled, and dropped first. The MVP has no unattended calls.

### G12 · CertWatch retired, its Vercel project still exists — `OPEN, operator`
`track3-certwatch/` was deleted from the miner repo on 2026-09-02 (never funded, no users). The
Vercel project `certwatch` (`app-five-blond-45.vercel.app`) still serves an empty dashboard; delete
it from the Vercel dashboard when convenient so judges do not find two Track 3 apps.

### G13 · Vercel misread the Hono web handler and auto-detected a Hono preset — `CLOSED 2026-09-02, confirmed live`
Runtime logs: "default export returned a Response — the default-export signature is (req, res) => void"
and "Invalid export found in module /var/task/src/app.js". Fixed by exporting
`getRequestListener(app.fetch)` from `api/index.ts`, `framework: null` in vercel.json, `export default
app`, and a `public/` output dir. Confirmed live 2026-09-02 15:00 UTC: the operator's redeploy is serving, `/` returns 200 with the
landing page and `/api/stats`, `/keys`, `/v1/*` and `/mcp` all answer.

### G14 · The second-opinion direct request is a heuristic — `MEASURED 2026-09-02, endpoint bug fixed`
`directRequest()` sends `{query}` plus any of `q/question/text/prompt/input/message` the miner's
`input_schema` declares. Measured over 129 active miners:

- **59 (46%) declare a question-shaped key.** The other 54% need typed inputs — lat/lon, an
  address, a tx hash — and will 422 at the node's free pre-validation, which costs nothing and is
  recorded as `error`.
- **29 (22%) publish more than one endpoint**, so the old "use `endpoints[0]`" rule was a coin
  flip for them. degenlens-onchain publishes **33**, of which `endpoints[0]` is ONCHAIN_TX_LOOKUP —
  a FRAUD_DETECTION second opinion was being sent to the transaction-lookup endpoint.
- Fixed: `endpointFor()` picks the endpoint whose description names the intent. **Only 7 of the 29
  multi-endpoint miners name their intents that way**, so for the other 22 it still falls back to
  the first endpoint. That fallback is the remaining heuristic.
- **5 intents are served by exactly one miner**, so no second opinion is possible for them at all;
  `secondOpinion` already reports that honestly rather than failing.

Still open: which miners actually answer a direct request, which needs real traffic.

### G15 · A second opinion re-asks the question from its stored 200-character preview — `OPEN, accepted`
The ledger keeps `preview` (the question clipped to 200 chars), not the full text, so `/second`,
the web button and `telegraph_second_opinion` re-ask a longer question in its clipped form. Almost
every real question is shorter than that. Storing the full text would put user prose in a public
table, which is worse. If a clipped re-ask ever produces a visibly different answer, say so on the
card rather than hiding it.

### G16 · Health alarm — `CLOSED 2026-09-02, fired end to end`
Proven with one `workflow_dispatch` run against the live unfunded deployment
([run 33648541786](https://github.com/Harshyadav442277/telegraph-morse/actions/runs/33648541786)):
the probe returned ALARM/exit 1, the workflow opened
[issue #1](https://github.com/Harshyadav442277/telegraph-morse/issues/1) labelled `health-alarm`
with the probe output verbatim, and failed the run so the Actions tab shows it.

That first run exposed a second problem, since fixed: on a 30-minute schedule a long outage would
have posted ~48 "still broken" comments a day. The workflow now comments only when the **problem
set changes**, or once every 6 hours. Verified locally against the real issue body — with today's
unchanged problems it stays quiet.

**Auto-close proven 2026-09-02 18:20 UTC:** once the wallet was funded and the probe went HEALTHY,
[run 33666604042](https://github.com/Harshyadav442277/telegraph-morse/actions/runs/33666604042)
closed issue #1 with the healthy output attached. Open, de-duplicate and close are all now
exercised against the real deployment. G16 is fully closed.

### G17 · The x402 payment path — `CLOSED 2026-09-02 18:10 UTC, paying in production`
Morse pays. First live receipt through the deployed app:
`0x0691ca3f54514e5ea5ce342d8dadc30c58c48ada711cdfde01e171b4ee0821a1` — LiveCert #1 for
SSL_VERIFICATION, $0.01, settled on-chain as
`0x31b9b480548034ad571448194ea09bf12a13f3ad2903f88d3307dd191e2af007`, `paidByMorse: true`, and the
node's own `verification.verified: true`.

Two real faults were in the way, and one wrong diagnosis of my own.

**Fault 1 — Telegraph's router is unusable from a serverless function.** `/engine/v1/ask` returns
`settle request failed: Post "https://facilitator.payai.network/settle": context deadline exceeded`
after ~47s. Vercel's ceiling is 60s, so there is no room. `/engine/v1/ask/{minerId}` settles in
~4s. Morse therefore does its own routing (`src/core/route.ts`): keyword rules over the canonical
intents, then the best-ranked active miner from the live leaderboard, with the choice written onto
the receipt. Dumber than the network's classifier, but inspectable — and it works.

**Fault 2 — the Request had to be materialised before the payment wrapper.** Handing
`wrapFetchWithPayment` a `(url, init)` pair works on a laptop and fails on Vercel: the retry went
out with no payment header and the node answered with a bare challenge. Wrapping fetch so it does
`globalThis.fetch(new Request(input, init))` fixes it. Found by tracing outbound requests from the
deployed function. The precise undici interaction is not pinned down, so that wrapper carries a
comment telling the next person not to simplify it away without re-testing a paid call.

**The wrong diagnosis, recorded so it is not repeated.** Hours went into "the node rejects a valid
signature", based on probing with Hardhat's unfunded test key. An unfunded payer gets
`invalid_exact_evm_signature`; a funded one gets a settle timeout or succeeds. The test key was a
misleading proxy for the real wallet, and generalising from it sent the investigation the wrong
way. Probe with the real payer, or do not trust the error.

### G3b · Per-call settlement transaction — `CORRECTED 2026-09-02`
Earlier entry claimed the node publishes no per-call `tx_hash`. Wrong: it is in the
`payment-response` **header** on the paying request, not in the signal record served afterwards.
Morse now captures it there, stores it on the ledger row, and links it to BaseScan from receipts
and `/verify`. The signal-record observation stands — `signal.tx_hash` really is absent — but the
conclusion drawn from it did not.

### G18 · Three API keys per network per UTC day will bite shared IPs — `OPEN, accepted for now`
`issueKey` caps issuance at three per salted client IP per UTC day. Judges behind one shared NAT —
a company, a university, a conference wifi — would exhaust that between them and see "Key limit
reached for today from this network." Verified live on 2026-09-02: the cap works, and this
session's own repeated e2e runs hit it, which is how it was found.

Raising it is the wrong fix: each key carries 100 paid calls a day, so three keys already put 300
of the 1,500-call daily budget behind one IP. The e2e suite now caches its key in `.morse-e2e-key`
instead of minting a new one per run. If a judge reports being blocked, the operator can issue a
key from another network and hand it over; a proper fix would be an operator-only issuance route
behind `ADMIN_TOKEN`, which is not built.
### G19 · The health workflow's *schedule* has never been observed to fire — `OPEN, watch it`
`.github/workflows/health.yml` declares `cron: "*/30 * * * *"`. It was pushed to `main` at
15:26 UTC on 2026-09-02; by 17:22 UTC — nearly two hours — **zero scheduled runs had started**.
Only the two `workflow_dispatch` runs triggered by hand exist.

Configuration is not the problem: `gh workflow view` reports the workflow active, the default
branch is `main`, and the repo is public. GitHub's scheduled runs are explicitly best-effort and
are delayed or dropped under load, and new repositories often wait a long time for their first
one.

So what is proven is narrower than "monitored every 30 minutes": the probe script works, and the
alarm path works on demand. Do not claim a cadence until a run appears with the event type
`schedule`. Check with `gh run list --workflow=health`. If none has fired by the freeze, either
say "on-demand monitoring" honestly, or move the probe to an external cron.

### G20 · The first ledger rows are our own verification, not users — `DISCLOSED 2026-09-02`
Every call in the ledger before the bot and the site were shared with anyone was made while
proving the payment path worked: a handful of `web` rows on 2026-09-02 between 18:10 and 18:15 UTC,
plus whatever the paid end-to-end test spends when it is run deliberately. They are real calls with
real receipts — nothing is fabricated — but they are **not adoption**, and must never be presented
as it.

Two consequences, both binding:
- X posts quote `usersAnswered`, and the first post that quotes a user number waits until the
  numbers are actually strangers'. Publishing "4 people asked" when three of them were us would be
  exactly the metric inflation rule 04 forbids.
- The ledger shows `channel`, so anyone can see the early rows are `web`. When Telegram and MCP
  traffic arrives the mix becomes self-evident. Do not delete the early rows to make the numbers
  look cleaner; deleting evidence is worse than explaining it.

If a judge asks "how many of these are yours", the answer must be available and honest.
