# GAPS.md — what is missing, broken, or unverified

Honesty ledger. Anything unverified lives here rather than being rounded to "fine". Feeds the
README's limitations section.

### G1 · Vercel function duration vs miner latency — `OPEN, verify on first deploy` (the first deploy found a different bug first: see G13)
Miners take up to ~45s. The design acks the Telegram webhook and finishes in `waitUntil` with
`maxDuration: 60`. Whether the Hobby plan honours 60s for this project is unverified. Fallback:
an always-on worker for the bot. Test with a deliberately slow intent on day 1.

### G2 · x402 SDK 2.24.0 — `API SHAPE VERIFIED 2026-09-02; gasless payer still unproven`
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

**Still unproven:** that the payer needs no Base Sepolia ETH (EIP-3009 authorisation, facilitator
pays gas). Only a first real paid call settles that — see G17.

### G3 · Signal hash derivation — `OPEN`
`GET /engine/v1/signal/{hash}` returns the payload the hash commits to. The hashing scheme is not
documented; if we cannot recompute it, `/verify` shows the node's record and the on-chain transfer
and says so. Do not claim "re-derived" unless it is.

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

### G9 · End-to-end coverage stops at the wallet — `PARTIALLY CLOSED 2026-09-02`
`e2e/judge-journey.spec.ts` runs the judge journey against the live deployment: landing and
counters, ledger-vs-API agreement and the durable-ledger check, key issuance, the MCP handshake and
tool list, free discovery, and the honest-failure path. 5 passed on 2026-09-02 against production.
**Still unproven:** the two wallet-gated tests — every ledger hash verifying on the node (test 3)
and the funded ask → receipt → verify → ledger loop (test 7, behind `MORSE_E2E_PAID=1`). Neither
can run until `EVM_PRIVATE_KEY` is set.

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
unchanged problems it stays quiet. **Still unproven:** the auto-close path, which needs the
deployment to become healthy.

### G17 · The x402 payment path has never executed — `OPEN, but substantially de-risked 2026-09-02`
Everything downstream of a paid call is built and typechecked but has never run. One real call
closes G2's second half, G3 (in its shown-not-derived form), most of G8 and G14, and the
wallet-gated half of G9. Until then Morse's ledger reads 0 calls — 45% of the rubric at zero.

**What is now verified without spending** (`npm run preflight`, and the table in
docs/TELEGRAPH_FACTS.md): the node's live 402 challenge was fetched unpaid and diffed field by
field against our client. Scheme `exact`, network `eip155:84532`, asset
`0x036CbD…F7e`, EIP-712 domain version `2`, price $0.01 against the client's $1 cap, and
`maxTimeoutSeconds` 60 against our 45s abort — **every field our client must satisfy matches**,
and the asset is the one `DEFAULT_ASSETS` recognises so the client's own spend controls permit it.

**What remains genuinely unproven, and cannot be checked without spending:** the EIP-3009 signature
being accepted, the facilitator settling it on-chain, and the `signal_hash` coming back and
resolving at `/verify`. Also whether the payer needs Base Sepolia ETH — the EVM accept carries no
`feePayer` (the Solana one does), which is suggestive, not proof.

Run `npm run preflight` the moment the key is set; make the one call only if it prints READY.

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