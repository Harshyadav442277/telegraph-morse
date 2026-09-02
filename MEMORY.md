# MEMORY.md — decisions made and lessons learned

Read first every session. Update at session end. Keep it short: decisions and why, lessons and
what they cost. Current state lives in PHASES.md; risks in GAPS.md.

## 2026-09-02 15:10 UTC — HANDOFF STATE (read this first)

**Built and verified locally:** the whole codebase (core `ask`, guards, Neon/memory ledger, Telegram
bot, web ledger + verify + keys pages, REST, hosted MCP). `npm run typecheck` clean, 23/23 tests,
local smoke test of every route green including the MCP `initialize` and `tools/list` handshake.

**Deployed once, broken, fix committed but NOT redeployed.** Vercel project `telegraph-morse`
(scope `wukong4`), production alias `https://telegraph-morse.vercel.app`. The first deploy 504'd for
two reasons, both fixed in commit ff99bd3: (1) Vercel's Node runtime treated Hono's web handler as a
classic `(req,res)` export and never ended the response → `api/index.ts` now exports
`getRequestListener(app.fetch)`; (2) Vercel auto-detected Hono as a framework preset and expected
`src/app.ts` to default-export the app → `framework: null` in vercel.json plus `export default app`.
A `public/` dir was added because "Other" framework requires an output directory. **Next action:
`vercel deploy --prod --yes --scope wukong4` from this folder, then verify `/api/stats`, `/`,
`/api/health`, `/keys`, `POST /api/keys`, `/mcp tools/list`, `/verify/<hash>`.** The operator paused
the deploy once; ask before running it.

**Infra done:** Neon project `telegraph-morse` (id `empty-moon-44512485`, db `morse`, us-east-1);
Vercel production env has ADMIN_TOKEN, TELEGRAM_WEBHOOK_SECRET, HASH_SALT, DATABASE_URL,
DAILY_BUDGET_CALLS=1500, MORSE_PUBLIC_URL, TELEGRAPH_NODE. Vercel rejects env names starting
with `PUBLIC_`, hence `MORSE_PUBLIC_URL`. Deploys are CLI only (no Git integration connected).

**Waiting on the operator:** `EVM_PRIVATE_KEY` (new burner, faucet-funded) and `TELEGRAM_BOT_TOKEN`
in Vercel. After the token lands: `curl -X POST https://telegraph-morse.vercel.app/admin/telegram/webhook
-H "Authorization: Bearer <ADMIN_TOKEN>"` registers the webhook (token is in Vercel env, read it there).
After the key lands: make ONE real paid call and check `/verify/<hash>` shows the payer = our wallet
(closes GAPS G2); then the first X post.

**Tooling connected (user scope):** Context7, Playwright (+Chromium), Vercel MCP and Neon MCP
(authenticated), plugins frontend-design / code-review / security-guidance / commit-commands.
Telegraph MCP is declared in `.mcp.json` and needs `TELEGRAPH_EVM_PRIVATE_KEY` in the environment.

**Then, in order (PHASES.md):** P2 Playwright judge journey against production; P3 measure the
second-opinion heuristic on real miners (`directRequest` guesses payload keys from `input_schema` —
expect some miners to reject it; record which); P4 README quick-starts; freeze 2026-09-05 18:00 UTC.

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
