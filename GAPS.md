# GAPS.md — what is missing, broken, or unverified

Honesty ledger. Anything unverified lives here rather than being rounded to "fine". Feeds the
README's limitations section.

### G1 · Vercel function duration vs miner latency — `OPEN, verify on first deploy` (the first deploy found a different bug first: see G13)
Miners take up to ~45s. The design acks the Telegram webhook and finishes in `waitUntil` with
`maxDuration: 60`. Whether the Hobby plan honours 60s for this project is unverified. Fallback:
an always-on worker for the bot. Test with a deliberately slow intent on day 1.

### G2 · x402 SDK 2.24.0 export names and gasless payer — `OPEN, verify against .d.ts`
Docs show `createSigner`; the 2.23 package exported `toClientEvmSigner`, `ExactEvmScheme`,
`x402Client.fromConfig`. 2.24.0 is current. Also unverified: that the payer needs **no** Base
Sepolia ETH (EIP-3009 authorisation, facilitator pays gas). Confirmed only by a first real paid call.

### G3 · Signal hash derivation — `OPEN`
`GET /engine/v1/signal/{hash}` returns the payload the hash commits to. The hashing scheme is not
documented; if we cannot recompute it, `/verify` shows the node's record and the on-chain transfer
and says so. Do not claim "re-derived" unless it is.

### G4 · "Real users" is our count of hashed identities — `OPEN, disclose`
Telegram user ids, web session cookies and API keys are counted distinct after salting. One
person on two surfaces counts twice; a group of ten forwarding one answer counts once. Publish the
method next to the number. Never inflate; when in doubt, undercount.

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

### G9 · No end-to-end test exists yet — `OPEN until P2`
The judge journey must be run with Playwright against production before the freeze.

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

### G13 · Vercel misread the Hono web handler and auto-detected a Hono preset — `CLOSED 2026-09-02, fix committed, redeploy pending`
Runtime logs: "default export returned a Response — the default-export signature is (req, res) => void"
and "Invalid export found in module /var/task/src/app.js". Fixed by exporting
`getRequestListener(app.fetch)` from `api/index.ts`, `framework: null` in vercel.json, `export default
app`, and a `public/` output dir. Not yet confirmed live because the operator paused the redeploy.

### G14 · The second-opinion direct request is a heuristic — `OPEN, measure on real miners`
`directRequest()` sends `{query}` plus any of `q/question/text/prompt/input/message` the miner's
`input_schema` declares, to the miner's first endpoint. GET miners with required params (lat/lon)
will 422 at the node's pre-validation, which costs nothing and is recorded as `error`. Record which
miners answer and which do not, and prefer miners that accept `query` when picking the candidate.
