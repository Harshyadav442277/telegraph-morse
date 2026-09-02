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

### G5 · Track 3 submission form unknown — `OPEN`
submissions.telegraphprotocol.com shows "TRACK 3 — COMING SOON" (2026-09-02). Field list unknown.
Keep ready: repo URL, live URL, X handle, payer wallet address, short description, gif. Check daily.

### G6 · Exact Track 3 deadline — `OPEN`
The rules site's countdown says Sep 7 23:59 UTC. The exact wording is posted in Discord
`#announcements`; the operator should transcribe it into docs/TELEGRAPH_FACTS.md.

### G7 · Faucet cadence — `OPEN`
Circle's faucet: 20 USDC per 2h per address per chain (web sources, 2026-09-02). At $0.01/call that
is 2,000 calls per claim; the demand multiplier raises price to $0.015 above 1,000 requests/24h
per intent. The stats page shows the payer balance so a dry wallet is visible before it hurts.

### G8 · Confidence is heterogeneous across miners — `OPEN`
Some miners report `confidence` in [0,1], some report nothing, some report strings. The
second-opinion threshold only fires when a numeric confidence exists; otherwise "not reported".
Record per-miner behaviour as it is observed.

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

### G14 · The second-opinion direct request is a heuristic — `OPEN, measure on real miners`
`directRequest()` sends `{query}` plus any of `q/question/text/prompt/input/message` the miner's
`input_schema` declares, to the miner's first endpoint. GET miners with required params (lat/lon)
will 422 at the node's pre-validation, which costs nothing and is recorded as `error`. Record which
miners answer and which do not, and prefer miners that accept `query` when picking the candidate.

### G15 · A second opinion re-asks the question from its stored 200-character preview — `OPEN, accepted`
The ledger keeps `preview` (the question clipped to 200 chars), not the full text, so `/second`,
the web button and `telegraph_second_opinion` re-ask a longer question in its clipped form. Almost
every real question is shorter than that. Storing the full text would put user prose in a public
table, which is worse. If a clipped re-ask ever produces a visibly different answer, say so on the
card rather than hiding it.

### G16 · The health alarm's issue-opening step is unproven — `OPEN, needs one workflow run`
`scripts/health-probe.mjs` is proven: run against production on 2026-09-02 it correctly returned
ALARM and exit 1 for the unfunded wallet, and the workflow YAML parses with the expected steps.
What is **not** proven is `.github/workflows/health.yml` actually creating the `health-alarm`
issue, because that writes to the public repo and needs the operator's go-ahead. Prove it with one
`workflow_dispatch` run while the deployment is still unhealthy — it should open exactly one issue,
and close it once the wallet is funded.

### G17 · The x402 payment path has never executed — `OPEN, the single biggest risk`
Everything downstream of a paid call is built and typechecked but has never run: the EIP-3009
signing in `payingFetch()`, the 402 challenge/response, the settlement tx, the `signal_hash` coming
back, the receipt extraction, the ledger row, `/verify` matching the payer. This is G2 restated as
what it actually blocks. One real call closes G2, G3 (in its shown-not-derived form), most of G8
and G14, and the wallet-gated half of G9. Until then Morse's ledger reads 0 calls, which is 45% of
the Track 3 rubric sitting at zero.
