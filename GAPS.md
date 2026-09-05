# GAPS.md — what is missing, broken, or unverified

Honesty ledger. Anything unverified lives here rather than being rounded to "fine". Feeds the
README's limitations section.

### G34 · Recipe rows are labelled "Morse (fallback)", and a router failure leaves no reason on the row — `OPEN 2026-09-05, reported to the organisers`
Recipes pass `skipGuard = true` to `askNetwork`, and the engine router is only tried when that is
false, so every `safe` / `weather` / `fact` / `wallet` leg goes straight to `/engine/v1/ask/{minerId}`.
`routed()` in `src/web/landing.ts` has no recipe case, so those rows read "Morse (fallback)", and the
FAQ says the router did not answer within 20 s — false for them. The operator sent a screenshot of
exactly such rows to the organisers as router failures, and they asked for detail. Measured on the
200 newest rows (2026-09-04 04:16 → 2026-09-05 13:07 UTC): 15 rows are real fallbacks (kind `ask`,
routed by Morse); 13 recipe rows carry the same label with no router involvement at all.

Second half: `tryEngineRouter` writes the router's error only to `console.error`, and Vercel keeps
runtime logs for one hour on this plan (verified 2026-09-05: the 6 h → 1 h window is empty, the
50 min → 20 min window is populated), so none of the 15 fallbacks has a reason on record anywhere.

Fix, written and **not deployed** under the freeze: label recipe rows "Morse (recipe)", correct the
FAQ line in `src/web/layout.ts`, and add a `router_error` column filled from `tryEngineRouter`. Deploy
only after the paid journey is re-run. The full account sent to the organisers is
[docs/ROUTER_REPORT_2026-09-05.md](docs/ROUTER_REPORT_2026-09-05.md).

### G33 · Every fact check failed because one miner broke and Morse gave up — `FIXED 2026-09-04 16:50 UTC; retry not reproduced live`
Measured on the newest 200 ledger rows: 29 failures, but **all 11 failures on kinds that still
exist were the same one** — `FACT_CHECK` → `qarinah-proofpack`, which answers
`500 {"code":"PROOF_PIPELINE_ERROR"}`. Morse's own routing put it first, and the candidate loop
only moved to the next miner when the failure was a refused payment or the node's 422
pre-validation. A 5xx ended the attempt, so **every fact-check question a visitor asked failed**,
while `assay-miner`, `livecert` and `tavily` all serve the same intent. Fact check is one of the
eight chips on the landing page and one of the five buttons on Telegram `/start`, so a judge had a
good chance of hitting it: 10.3% of live-kind calls failed, and every one of them was this.

The old rule was written to avoid paying twice, and it was too broad. The node **"settles only on
2xx; failed calls are free"** (docs/TELEGRAPH_FACTS.md, read 2026-09-02), so a 5xx costs nothing
and is safe to move on from. A **timeout still is not**, because the outcome was never seen and the
call can land afterwards — that is exactly what the chain-only settlements on `/proof` are. The
rule is now *known outcome*, not *bad outcome*: `isFreeFailure()` in `src/core/ask.ts`, covered by
test/free-failure.test.ts.

Also fixed with it: a failed question used to show the node's raw JSON — `Engine returned 500:
{"error":"upstream call failed: …PROOF_PIPELINE_ERROR…"}` — to whoever asked. The ledger row still
keeps that text; the person now gets a sentence that names the miner and says whether they were
charged.

**What is and is not verified, exactly.** The predicate is covered by six unit assertions. In
production the `fact` recipe — which skips Telegraph's router and so runs Morse's own candidate
loop, the path that was failing — now answers: FACT_CHECK → livecert #1 in 652 ms, verdict
"contradicted". But **the retry itself was not reproduced live**: by the time the fix deployed,
`qarinah-proofpack` had recovered (it answered a direct `/miner` call with confidence 0.83) and had
moved from #1 to #3, with livecert #1. So the first candidate no longer fails and there is nothing
to retry past. The fix is insurance against the next time any #1 miner has a bad hour — which is
the general case, since one broken leader currently takes a whole intent down for every user — not
a repair of something still broken today. Do not claim the retry was observed in production.

### G1 · Vercel function duration vs miner latency — `MEASURED 2026-09-02`
Real paid calls through the deployment complete in **200 ms – 4 s**, far inside the 60s ceiling —
because Morse calls miners directly. The router would have blown it: `/engine/v1/ask` takes ~47s
just to fail on settlement (G17). The original concern was right, and the answer was to stop using
the router.
The Telegram path still acks the webhook and finishes in `waitUntil` with `maxDuration: 60`, which
remains the right shape for a slow miner.

**Superseded 2026-09-03, do not read the paragraph above as current design.** The router recovered
and Morse asks it *first* on every question, on a 20 s leash, falling back to its own routing only
when it does not answer (G17, A2). Direct calls are now only what a person asked for by name.

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

### G5 · Track 3 submission form — `OPEN FOR SUBMISSIONS as of 2026-09-03 16:15 UTC`
The tab flipped from "TRACK 3 — COMING SOON" to **"TRACK 3 — GITHUB APP"** some time between
2026-09-02 15:31 and 2026-09-03 16:15 UTC. It asks for four fields — GitHub repository, title,
description, live app URL — and requires a connected wallet to submit. Content is drafted and ready
to paste in [SUBMISSION.md](SUBMISSION.md). **Submitting is the operator's job**: it needs a wallet
signature, which Claude never does.

### G6 · Exact Track 3 deadline — `CONFIRMED 2026-09-03`
The submission form states it verbatim: **"deadline: Mon, 07 Sep 2026 23:59:59 UTC"**, with a live
countdown. This supersedes any inference from the rules page.

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
everywhere they are rendered. (The second-opinion threshold it also guarded was removed on
2026-09-04, G32; the label is what mattered and it stays.) Covered by test/catalogue-quirks.test.ts.

Still open: what miners put in these fields at *runtime* (strings, 0-100, nulls) can only be seen
with real traffic.

### G9 · End-to-end coverage — `CLOSED 2026-09-03 05:20 UTC, 7/7`
`MORSE_E2E_PAID=1 npm run e2e` against production: **7 passed, 0 skipped**.

Two things had to change for the suite to be able to go green at all. Test 6 and test 7 were
mutually exclusive — one only ran unfunded, the other only funded — so test 6 now asserts the
honest-failure contract in *both* states, using a hash the node never issued, which costs nothing.
(It called the second-opinion endpoint for that until 2026-09-04; it now calls `/api/verify`, G32.) And test 4 needed an API key, which the three-per-network-per-day cap (G18)
had exhausted; running from a second network gave a fresh quota, and the suite now caches its key
so repeat runs stop burning it.

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

**Measured on real traffic 2026-09-02/03.** Running all four recipes against production found
three routing bugs that no unit test would have caught, because each needed the live catalogue:

1. **A URL's scheme stole the safety question.** The SSL rule matched `https`, which every URL
   contains, so `safe`'s URL_SCAN leg was routed to SSL_VERIFICATION and the recipe asked the same
   miner the same thing twice. URL_SCAN now sits above SSL, and SSL matches certificate words only.
2. **An ENS name outranked an explicit fraud question.** `wallet`'s risk leg went to
   WALLET_BALANCE_CHECK because `vitalik.eth` matched first. FRAUD_DETECTION now sits above it.
3. **A place name was sent as a wallet address.** Filling every subject-shaped parameter handed
   chainsight-oracle `address: "Chennai"`, and the node's free pre-validation correctly predicted
   failure. Subject keys are now a fallback only for miners that accept no prose at all — which is
   what openweathermap (`lat`, `lon`, `q`) needs, since it answers `city not found` to a sentence.

All four recipes now complete: safe (3 legs, 3 intents, 3 different #1 miners), weather, wallet and
fact (2 legs each). The node's pre-validation is genuinely useful — it refuses bad requests for
free rather than charging for a failure.

**Also found:** recipes fired their payments concurrently, and three in flight from one wallet
draws `batch_send_failed:missing_or_invalid_parameters` from the facilitator, silently losing a
leg. They now run one at a time.

### G15 · A second opinion re-asks the question from its stored 200-character preview — `MOOT 2026-09-04: the feature was removed (G32)`
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

### G18 · Three API keys per network per UTC day will bite shared IPs — `CONFIRMED IN PRACTICE, accepted`
Confirmed twice: it blocked this project's own test suite for six hours, and switching networks
cleared it instantly. A judge behind a shared NAT will hit the same wall. Still not worth raising —
three keys already put 300 of the 1,500 daily calls behind one IP — but if a judge reports it, the
answer is to hand them a key issued elsewhere.
`issueKey` caps issuance at three per salted client IP per UTC day. Judges behind one shared NAT —
a company, a university, a conference wifi — would exhaust that between them and see "Key limit
reached for today from this network." Verified live on 2026-09-02: the cap works, and this
session's own repeated e2e runs hit it, which is how it was found.

Raising it is the wrong fix: each key carries 100 paid calls a day, so three keys already put 300
of the 1,500-call daily budget behind one IP. The e2e suite now caches its key in `.morse-e2e-key`
instead of minting a new one per run. If a judge reports being blocked, the operator can issue a
key from another network and hand it over; a proper fix would be an operator-only issuance route
behind `ADMIN_TOKEN`, which is not built.
### G19 · The health workflow's schedule — `CLOSED 2026-09-03, fires but late`
Six scheduled runs observed, all successful. GitHub's cron is best-effort and it shows: the
declared interval is 30 minutes, the actual gaps were 2h45m, 1h57m, 3h41m, 5h07m, 5h20m. Good
enough to notice a dead deployment within a few hours, not good enough to call it monitoring. Not
worth fixing for a hackathon; worth knowing before anyone relies on it.

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

### G21 · General questions were routed to a miner that could not answer — `CLOSED 2026-09-03`
The ledger showed 24 failures against 56 successes, and every single failure was a question that
matched no keyword rule. Those fall back to CHAT_COMPLETION, whose top three miners require both
`messages` and `model`; Morse sent neither, so the node returned `Invalid model name passed in
model=None` every time. That is the path a stranger asking anything general lands on, so the
success rate on the demo's most likely question was zero while every routed intent sat at 100%.

Three fixes, each earned from a different failure:
1. **Skip miners whose required fields cannot be filled from a sentence.** Costs a rank, buys an
   answer. `canAddress` is the check.
2. **Fall through to the next addressable miner** when an attempt provably cost nothing — a refused
   payment, or the node's free pre-validation. Never on a 500 or a timeout, which may already have
   been paid for. Of the top six CHAT_COMPLETION miners one refuses payment outright and another
   422s on a field it never declared, so one fallback is not enough.
3. **Send `messages` for chat-shaped intents whether or not the schema declares it.**
   telegraph-chatbot declares an *empty* schema and then rejects the call for a missing `messages`
   body — the declared schema simply cannot be trusted.

**Measured after:** every call from 16:08:46 UTC onward succeeded — 6 for 6, including two
CHAT_COMPLETION, and spanning WEATHER_CHECK, SSL_VERIFICATION and URL_SCAN. Every failure in the
ledger sits at 16:06 or earlier, before the last of the three fixes deployed. Two of those
failures were Telegram, so real in-chat traffic was hitting this too.

The lifetime figure on the public ledger will stay depressed for a while — it counts a day of
failures from before the fix, and those rows are not being deleted. A judge reading it sees an
honest history rather than a curated one, which is the trade this project keeps making.

**The lesson worth keeping:** the ledger found this, not a test. Grouping failures by intent showed
every routed intent at 100% and every unrouted one at 0%, which pointed straight at the fallback.
Failed rows now keep their intent and miner for exactly that reason — before this they all logged
as `(unrouted)` and the pattern was invisible.

### G22 · Morse routes 41% of its calls to the operator's own Track 1 miner — `DISCLOSE, do not rig`
`livecert` is the operator's Track 1 miner (`track1-miner/miner.yaml`, slug `livecert`). It is also
ranked **#1 in six intents** and #2 in four more, so Morse's "call the best-ranked live miner" rule
sends a lot of traffic its way: **26 of 64 answered calls, 41%**, measured 2026-09-03.

Nothing here is rigged — Morse reads the live leaderboard and takes the top addressable miner, and
livecert genuinely holds those ranks. But Track 1 is judged partly on requests served, so Track 3
traffic landing on the same operator's Track 1 miner is exactly the shape of thing rule 04 exists
to catch, and a judge who notices it unaided will assume the worst.

**The response is disclosure, not distortion.** Deliberately skipping the best-ranked miner would
make Morse worse at its job and would be its own kind of dishonesty. So: the routing panel on the
landing page names the overlap, GAPS records it, and the submission should mention it rather than
hope nobody checks. The ledger already shows `minerSlug` on every row, so the overlap is visible to
anyone who looks — better that it comes from us first.

**If the organisers say it is a problem**, the fix is one line in `route.ts` excluding the slug, and
the receipts would then say a lower-ranked miner was chosen and why. Ask before assuming.

### G23 · Request volume on this network is unrelated to rank — `MEASURED 2026-09-03`
Worth knowing before optimising for the wrong number. Measured across the catalogue and the Daemon
feed:

| miner | lifetime requests | best rank | intents |
|---|---:|---|---:|
| degenlens-onchain | 1,181 | **#2** (ranked #1 in nothing) | 3, via 33 endpoints |
| amanat-weather-risk | 523 | **#5** | 3 |
| onlookout-weather | 333 | **#10** — its only intent | 1 |
| livecert | 274 | **#1 in six intents** | 13 |

Of 100 sampled user-paid calls network-wide in 24h: amanat-weather-risk 26%, skywire-storm-alert
25%, degenlens-onchain 14%. Amanat is ranked #5, #7 and #8 in the three intents it serves.

So the engine's 70/20/10 split to #1/#2/#3 is not what drives these totals. Two things do:
`total_requests_served` is **lifetime cumulative**, so an earlier registration keeps its count
forever; and **direct calls to `/engine/v1/ask/{minerId}` bypass ranking entirely** — the caller
names the miner, which is what Morse itself now does. A miner with a heavy direct caller outranks
the leaderboard on volume while scoring near zero: degenlens' average score is 0.000000000000089.

### G24 · The question text is public, and users had no way to know — `DISCLOSED 2026-09-03`
`/api/recent` returns `preview` — the question clipped to 200 characters — for every call. It is
deliberate: the ledger is the evidence, and a ledger with the questions redacted is much weaker
proof that real people asked real things. But the ledger *table* does not render it, so nothing on
the site or in the bot told anyone their question was publicly queryable.

Now disclosed in all three places a person could encounter it: the ledger panel on the landing
page, the bot's `/help`, and docs/TRY_THESE.md before anyone shares it. Kept rather than removed,
because hiding it would weaken the adoption evidence that is 45% of the score — but a user typing
into a Telegram bot should not have to read the API to learn this.

### G25 · Ask the Podium — what it can and cannot say — `REMOVED 2026-09-04 (G32); kept as the record of what was measured`
Podium asks the other top-ranked *addressable* miners for the same intent the same question,
directly, and compares the answers. Verified live: SSL_VERIFICATION on github.com — txlens #1 (router)
+ livecert #2 + preflight #3, "3 of 3 agree: valid", 5.6 s, two extra receipts. Limits, stated on the
page and in the code (`src/core/agree.ts`):
- **Agreement is judged only for verdict intents** (SSL_VERIFICATION, URL_SCAN, FRAUD_DETECTION,
  FACT_CHECK, AI_TEXT_DETECTION, by verdict words with negations tested first) **and figure intents**
  (prices, FX, gas, balances, holder counts, TVL, temperature, by number within a stated tolerance).
  Everything else is shown side by side and labelled "not judged automatically".
- **Unaddressable podium miners are skipped and named.** pricepulse-crypto-consensus (#2 for
  CRYPTO_PRICE) requires fields Morse cannot fill from a sentence, so the podium for that intent was
  #1, #3, #4. A subject extractor for symbols and places would widen this; not built.
- **A 200 with no answer counts as not comparable**, e.g. sentinel-risk-oracle's "price data
  temporarily unavailable"; a timeout (15 s per miner) is recorded as `timeout` and not charged.
- **Verdict extraction is heuristic.** A miner whose prose says "not valid" but whose label says
  "valid" is read as valid (the label wins). Both are shown, so a reader can see the disagreement.
- **Older ledger rows have no stored answer text**, so a podium on a row from before 2026-09-03 18:45 UTC
  compares only the new answers and marks the original as not comparable.
- **Cost and pacing:** at most two extra paid calls, sequential (the facilitator rejected concurrent
  payments), user-initiated only — never automatic, never scheduled (rule 04).

### G26 · Engine-routed rows before 2026-09-03 18:26 UTC carry display names and no rank — `CLOSED, history kept`
The Engine returns `miner_name` as a display name ("TxLens"), so `minerBySlug(miner_name)` found
nothing and engine-routed receipts lost their rank and signal mapping. Fixed by resolving on
`miner_id` (`resolveMiner`). Rows from 18:18 to 18:26 UTC on 2026-09-03 keep the display name and
a null rank; they are not rewritten.

### G27 · Morse writes nothing on chain — `OPEN, deliberately not built`
The depth axis says "off-chain and on-chain", and at least one rival (amanat) settles parametric
cover through ERC-8183 jobs. Morse only reads the chain: `/proof` reconciles the payer's USDC
transfers with the ledger. Anchoring a podium verdict on chain would need an escrow deposit and a
job contract — a wallet action plus contract work that does not fit before the 2026-09-05 18:00 UTC
freeze and would add a failure mode to the judging window (Sep 8–18). Recorded so the choice is
visible. The honest on-chain claim is "every payment is on chain and reconciled", not "verdicts are
anchored".

### G28 · The Daemon WebSocket feed is not consumed — `OPEN, deliberately not built`
"Real-time streaming & persistent intelligence" is a named high-value area. The node offers
`wss://devnode.telegraphprotocol.com/engine/ws` subscriptions (recorded in the miner repo's
docs/TELEGRAPH_FACTS.md, "Consumer surfaces"), but a subscription needs `personal_sign` wallet auth
plus at least $1 USDC deposited in escrow through `EscrowFacet.depositUSDC()` — a wallet action —
and a socket held open, which a Vercel function cannot do. A "Morse Wire" Telegram channel fed by
Daemon signals would need a small always-on worker and the operator's escrow deposit. Not built;
decide after the hackathon, not inside the judging window.

### G29 · Four on-chain settlements have no ledger row — `RE-MEASURED 2026-09-04, shown on /proof`
Blockscout lists 120 USDC transfers from the payer to the Diamond; the ledger holds 118 settlement
hashes and all 118 are on chain. The two extra settlements (2026-09-02 17:56:56Z and 2026-09-03 18:11:04Z) have no
failed ledger row at those minutes either. The likeliest causes: the operator's local diagnostic run
on 2026-09-02, which paid from the same key outside the deployed ledger; and a Telegraph-router
attempt that hit Morse's 20 s budget and settled after Morse had already fallen back and paid a
second miner — a router failure is not written as a row, so a late settlement leaves no trace and one
question was paid for twice. Either way, "nothing charged" after a timeout is a hope, not a
guarantee: the node may settle after Morse stops waiting. `/proof` lists such settlements
under "on chain, not in the ledger" rather than hiding them, and Morse does not count them as
answered calls. A back-fill that attaches a late settlement to its row would close this; not before
the freeze.

Re-measured 2026-09-04 10:35 UTC: 174 transfers on chain, 170 settlement hashes in the ledger, all
170 matched, **four** chain-only. The two new ones support the late-settlement reading. 06:54:58Z
lands sixteen seconds after a podium leg to qarinah-proofpack that Morse recorded as a 15 s timeout
at 06:54:42Z. 09:35:12Z has no row at all, which fits a router attempt that hit its 20 s budget and
settled after Morse had fallen back, or a function cut off before it wrote. Each is one cent paid
for an answer nobody received; `/proof` lists them rather than hiding them.

### G30 · Every direct call to a multi-endpoint miner went to its first endpoint — `CLOSED 2026-09-04 ~10:10 UTC, fixed and verified live`
`endpointFor` chose an endpoint by finding the intent's name in the endpoint description, because
`/api/miners` returns endpoints as `{path, method, description}` and drops the `intents` list the
manifest declares. For miners whose descriptions do not name the intent — livecert, all twelve
endpoints — every guess failed and the call went to `endpoints[0]`, `/ssl-check`, which honestly
answered "No hostname was supplied with this request" to weather, storm, IP and paper questions,
with confidence 0. Every livecert podium and second-opinion leg since 2026-09-03 19:13 UTC was
wrong this way (six rows), and the ledger showed them as 0% confidence. Engine-routed asks were
never affected: the router picks the endpoint itself.

**Fix:** `withEndpointIntents` reads the miner's registered manifest (`yaml_url`, which the catalogue
does keep) once per miner per hour and parses `- path:` / `intents:` line by line; `endpointFor`
prefers that map, then the description guess, then `endpoints[0]`. It never throws — an unreachable
manifest leaves the old behaviour. Live parse: livecert 12/12, chainsight-oracle 14/14, txlens 15/16,
degenlens 9/33 (the rest declare no intents), preflight 0/12 (no `intents:` lines at all; its
descriptions carry the fallback). Verified with one paid podium round on the 07:53 UTC
ACADEMIC_SEARCH answer: the livecert #2 leg now returns five papers, confidence 1, label `papers`.
Tests: parser on flow and block forms with param scopes ignored, and endpoint preference.

**Also fixed in the same deploy:** the ledger's "routed" column said "Morse" for podium, second-
opinion and named-miner rows, so three-quarters of the table read as router failures while the
router was answering 37 of 38 asks. It now says "Morse (podium)", "Morse (2nd opinion)",
"Morse (named miner)" or "Morse (fallback)", the hero receipt and the Telegram receipt line say
which, and the ledger header explains all four.

### G31 · The judge-journey test asserted the old answer-card markup — `CLOSED 2026-09-04`
The web answer card was rebuilt on 2026-09-03 (a `dl.rcpt` receipt with Answered by / Routed by /
Confidence / Cost / Signal hash), and the paid e2e step still looked for `#out .receipt` and the
words "served by". Run on 2026-09-04 10:33 UTC it failed while production answered correctly: the
ledger row was `ok` in 525 ms and the page showed the receipt. Selectors updated; the suite is 7/7
again at 10:42 UTC. The gap was the process, not the code: the UI change shipped on the evening of
2026-09-03 and the paid journey was left for the next session. Any UI change now re-runs the paid
journey the same day. The cost of the miss was one cent and eleven hours of a wrong "7/7" in the
handoff.

### G32 · Podium, automatic second opinion and the consensus report were judged re-ranking and spam — `REMOVED 2026-09-04 15:28 UTC`
An organizer (Discord, ~14:50 UTC) answered a "would a miner-check tool be useful" question and a
"how does the podium reach all three ranked miners" question with one reply: the explorer already
holds the miner data; checking or re-ranking miners is "building a router for our direct miners,
which is already handled by Telegraph"; paying N miners per request to find the best one is what the
protocol is designed to do once for everyone, "doesn't work economically for the end user", and is
spamming. What was good: extending Telegraph into Telegram; focus on adoption of the app and agent.

**Followed completely, and done.** Retired: Ask the Podium (G25), the automatic second opinion
(G14, G15), the `/consensus` report, and the never-built miner-check idea.

**Removal closed 2026-09-04 15:20 UTC, deployed 15:25, verified on production 15:28.** One commit
took out the podium button and its `pd:` callback, `/podium`, `/second`, their `/start`, `/help`
and `setMyCommands` entries, `POST /api/podium`, `/api/second`, `/v1/podium`, `telegraph_podium`,
`telegraph_second_opinion`, the `/consensus` page and `/api/consensus` with the Consensus nav item
and its help panel, `podium.ts`, `agree.ts`, `consensus.ts`, the web consensus page, their four
test files, `secondOpinion`, `secondOpinionOn`, `shouldSeekSecondOpinion`, `podiumHtml`,
`secondOpinionHtml`, the `AnswerCard.second` field, `SECOND_OPINION_THRESHOLD`, and the two ledger
lookups only these used. Typecheck clean, 66 unit tests, judge journey 7/7 paid. On production all
five retired routes return 404, `tools/list` returns the seven remaining tools, and the journey
asserts the two are absent so they cannot come back by accident. The ledger keeps every historical
row of kind `podium` and `second-opinion` with its label, and the ledger help panel says what those
labels mean and that the features are gone — history is not rewritten.

`/miner <slug>` stays, because direct dispatch to a named miner is what the organizers' own
reference apps do; it is now described that way everywhere, and the "test your own miner" framing
is gone.

**Still open, and only the operator can close it:** the Telegram `/` menu is published by
`setMyCommands` and still advertises `/podium` and `/second` until the webhook install is re-run
with a valid `ADMIN_TOKEN`. Both commands are gone from the deployment, so tapping either does
nothing at all. See the handoff in [MEMORY.md](MEMORY.md).

**What this cost and taught.** About two days of build went into features the judges consider a
bug, and 47 of 185 ledger rows (podium legs and second opinions) are calls the organizer would
call spam. The question that would have prevented it — "is a second, independent reading of your
leaderboard something you want?" — was never asked. Ask before building anything that sits between
a user and the protocol's own judgement.
