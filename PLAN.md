# Morse — Telegraph Hackathon Season I, Track 3 plan

**Last updated 2026-09-03 ~20:30 UTC** (re-judgment below). Track 3 closes **2026-09-07 23:59:59
UTC**, verbatim from the submission form. Feature freeze **2026-09-05 18:00 UTC**. Resolve every
deadline with `date -u`, never the local date — a handoff note in this repo was dated a day late by
reading the local clock.

Repo: <https://github.com/Harshyadav442277/telegraph-morse>. Verified protocol facts, with
dates, live in [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md).

---

## Claim

**Anyone with Telegram, a browser, or an AI agent can now get a verified, paid-for answer from
the Telegraph miner network in one message — without a wallet, testnet USDC, or an x402
client — because we solved the access problem:** Morse holds one funded payer wallet, pays
x402 for every call, and publishes a public, independently verifiable ledger of every request
it makes (signal hash on the node, USDC transfer on Base Sepolia).

## Reality checks

### Jargon strip

Telegraph is a marketplace where "miners" (APIs) answer questions and get ranked by validators.
To ask it anything today you need a crypto wallet, fake test money from a faucet, and a program
that speaks a payment protocol called x402. Almost nobody will do that. Morse is a Telegram bot
and a website that does the paying and asking for you, then shows which miner answered, how sure
it was, what it cost, and a receipt you can check on the network and on the blockchain.
Developers get the same thing as one URL they paste into Claude Code or Cursor.

The part not yet thought through is not the software. It is **getting real people to use it in
five days**. Everything in this plan bends toward that.

### Status quo

- Consuming Telegraph today means: clone Telegraph-MCP, Node 20+, make a burner wallet, get USDC
  from faucet.circle.com, set env vars, restart your agent. Or write x402 client code against docs
  that lag their own SDK. There is **no non-developer path at all**.
- The Intelligence Terminal shows the Daemon's own questions, not yours.
- Network-wide user-originated engine traffic (measured 2026-09-02 07:45 UTC via
  `/daemon/api/questions?source=user`): **771 calls in 24h, 1,811 in 7 days**, and 73 of the
  last 100 were direct calls to one miner (`degenlens-onchain`). At least one Track 3 app is
  already producing volume — machine-driven, single-miner. **Nobody is serving humans.**

### Who cares

- **Judges.** "Real Usage & Adoption" is 45% and is defined as *number of real users + actual
  volume of Telegraph calls*. A consumer surface is the only way to get *users*, not just calls.
- **Organizers.** They want proof that demand routes to ranked miners. Every Morse answer is that
  proof, with a receipt.
- **The 300+ registrants.** Most have never sent a paid query. Morse lets a miner author watch
  their own miner answer a stranger's question from Telegram.
- **Agent developers.** One URL, no wallet, no faucet.

### Failure list — ranked by how likely it is to go wrong

1. **Not enough real users.** The thing we are underestimating. Mitigation: bot live **today**,
   answers designed to be forwarded in group chats, daily X posts with real numbers, ask the
   organizers to try it in Discord, seed the operator's own university and crypto groups. Distinct
   users are counted and published from day one.
2. **Traffic that looks manufactured** (rule 04 = disqualification). Mitigation: per-user and
   per-key rate limits, no self-loops, no unattended "watch" jobs in the MVP, a public ledger that
   shows the channel and user distribution, and nothing calls the network without a human or a
   real agent behind it.
3. **Miner latency and failures ruin the UX.** Miners take up to ~45s; conversions and upstreams
   fail. Mitigation: instant "asking the network…" message edited in place, 45s timeout, automatic
   second attempt via direct ask to the next-ranked miner, honest error text.
4. **Serverless limits.** Telegram's webhook timeout vs Vercel function duration. Mitigation: ack
   the webhook immediately, finish the work with `waitUntil`, `maxDuration` 60s. Unverified until
   the first deploy (GAPS G1).
5. **Wallet and funding.** Mitigation: a *new* burner wallet (never the miner wallet, whose seed is
   compromised), faucet gives 20 USDC per 2h per address = 2,000 calls, low-balance warning on the
   stats page, the operator alone holds the key.
6. **Abuse of the free API/MCP** drains the budget. Mitigation: keys with daily caps, a global
   daily kill switch, issuance limits per IP.
7. **The Track 3 submission form is unknown** ("COMING SOON" on 2026-09-02). Mitigation: keep
   repo, README, live URL, X handle, payer address ready; check the site daily.
8. **x402 SDK drift** (`@x402/*` is 2.24.0 today; docs show older names). Mitigation: read the
   shipped `.d.ts`, pin versions, one integration test against the live 402.

## Judging criteria → where the hours go

| Criterion | Weight | What earns it | Build time |
|---|---:|---|---:|
| Real usage & adoption | 45% | live bot on day 1, forwardable answers, group-chat UX, hosted MCP + REST for agents, public counters, daily promotion | 45% (half of it is operator time: posting, sharing, replying) |
| Usefulness, creativity, depth of integration | 25% | multi-intent recipes, confidence-threshold second opinion, signal + on-chain verification, routing visibility, live Daemon signals; stretch: ERC-8183 anchoring | 30% |
| Engagement & updates on X | 25% | one post per real milestone with numbers and screenshots, tag @Telegraphprotoc, closing thread | operator daily, drafts in [docs/X_POSTS.md](docs/X_POSTS.md) |
| Technical execution & integration quality | 5% | typed code, tests, CI, honest README, zero mocks | 10% |
| Sponsor technology (Telegraph itself) | — | if the engine could be swapped for a stub it isn't being used: every answer comes from `/engine/v1/ask` and carries a `signal_hash` | — |

Every feature below maps to one of these rows. No mapping, no build.

## Novelty

- **Not done before:** a consumer front door to Telegraph (Telegram + web) with a **public,
  verifiable usage ledger** — every call links to `GET /engine/v1/signal/{hash}` and to the
  payer's USDC transfer on Base Sepolia. Judges never have to trust our numbers.
- **Nearest existing things:** Telegraph-MCP (local, bring your own wallet), the reference apps in
  telegraph-usecases (single purpose, old subnet API), direct integrations like the degenlens
  traffic (machine volume, no users). Morse removes the wallet from the user, is multi-intent, and
  shows the person asking who answered, how confident, and where to verify.
- **The one unforgettable thing:** *Ask Telegram, get a receipt from the Telegraph network.*

## Re-judged 2026-09-03 ~20:30 UTC — where Morse loses, and what was done about it

Rubric re-read on the live rules page (Track 3 tab, client-rendered): **45%** real users + actual
volume of Telegraph calls · **25%** usefulness, creativity, depth (off-chain *and on-chain*) ·
**25%** X · **5%** technical. Plus the framing the judges wrote for themselves: "not the best demo",
"surface-level integrations will not stand out", and "a competitive intelligence layer for machines
rather than **another aggregator**".

**Where Morse stands, measured, not estimated.** Ledger: 153 calls, 118 answered, 37 identities
answered of 58 that asked, 16 intents, 27 miners, $1.18; on 2026-09-03 alone 96 calls from 23
identities; channels web 90, Telegram 26, REST 1, MCP 1. Network, same day: **1,219 user-paid
calls in 24 h** (3,442 in 7 days), and a 153-signal sample of them resolves to **eight payer
wallets** — one direct caller of `degenlens-onchain` is 45% of everything, two weather-heavy apps
are 16% and 15%, and **Morse is fifth at about 6.5%**. About half the network's user traffic is
direct dispatch that never touches the router; Morse is one of the few apps exercising
`/engine/v1/ask` at all. On chain: **120 USDC settlements** from Morse's payer to the Diamond, and
every one of the ledger's 118 settlement hashes is among them; two chain settlements have no ledger
row (calls Morse recorded as timed out that settled anyway).

**The visible field** (GitHub, 2026-09-03): `amanat` — miner + scorer + parametric cover settled
through ERC-8183 jobs, an MCP server on the official registry, a deck and a film; `qarinah-proofpack`
— an evidence firewall that binds every miner result to the node's attestation before an agent
acts; `karan68/proofgate` — an agent URL firewall whose paid path is switched off in production;
`tripwire` — consensus-gated payments, mocked until its wallet is funded; `signal-jury` — a
multi-miner jury that calls miner URLs directly, so its calls bypass the node and are not Telegraph
calls; `rxtruth` — an autonomous six-hourly misinformation pipeline; `certsentinel-agent`,
`payproof`. Nobody else is serving humans without a wallet, and nobody else publishes a ledger.

### How and where we lose, ranked

1. **Adoption (45%) — volume and users.** Fifth by paid volume among eight payers, and the
   identities we count are mostly our own (G20). No distribution has happened: the bot is unshared
   and no X post is up. Nothing Claude builds changes this; only sharing does. What was built makes
   the usage we do get count for more: **on-chain proof** so the volume is undeniable, and
   **ask-a-miner** so the 300 miner authors in Discord have a reason to be users (test your own
   miner from Telegram or Claude Code, with a receipt, no wallet).
2. **"Another aggregator" (25%).** A "front door" is exactly what the rules page says Telegraph is
   not. Fixed by positioning, truthfully: Morse does not pick providers or blend answers; the ranked
   router picks, Morse pays, receipts, and verifies. The page now says so, and two pages exist that
   only a verification layer would have: `/proof` and `/consensus`.
3. **On-chain depth (25%).** The rubric says off-chain *and* on-chain; amanat writes jobs on chain.
   `/proof` reads the chain and reconciles it with the ledger. Writing to chain (ERC-8183 anchoring
   of a podium verdict) is not built: it needs escrow, a wallet action and contract work that do not
   fit before the freeze (G27).
4. **Rule 04 optics.** 41% of our traffic lands on the operator's own miner (disclosed, G22);
   podiums and recipes multiply calls per question; a bot in a group could have paid for every line
   of conversation. Fixed the last one: in groups Morse answers only when @mentioned or replied to.
5. **Judging-window fragility (Sep 8–18).** 58.8 USDC in the wallet (~5,800 calls), health probe
   hours-late (G19), `/proof` depends on Blockscout and degrades honestly when it is down. Operator:
   top up before Sep 7 and do not delete the Vercel project.
6. **Submission and X.** Not made yet; operator only. X is out of scope by instruction.

### Novel suggestions — kept, and deliberately not built

Built, deployed and verified live 2026-09-04 04:14 UTC: the **consensus report** (every podium round per intent, agreement rate, every
disagreement named, receipts linked — a public, independent reading of the leaderboard that costs
nothing and grows with use), **on-chain proof of usage** (ledger reconciled hash-for-hash against
the payer's USDC transfers via a public indexer), **ask a named miner** on MCP, REST and Telegram,
and the **group guard**.

Not built, with reasons: **human "was this right?" ratings per miner** (a validator-vs-human signal,
genuinely novel, but with 37 users the data would be noise before the close — the first thing to add
if Morse lives on); **a Daemon WebSocket feed pushed to a Telegram channel** (real-time streaming is
a named high-value area, but it needs ≥ $1 USDC in escrow — a wallet action — and an always-on
process, which serverless is not; G28); **ERC-8183 anchoring** (above); **MCP registry listing**
(distribution to agents; the publish step is the operator's, `server.json` is a ten-minute job on
request).

## What we build

- **MVP (Sep 2-3):** paying `ask` core; Telegram bot (free text plus `/weather`, `/price`,
  `/fact`, `/translate`, `/safe`, `/wallet`, `/verify`, `/stats`); web landing with the live
  ledger and `/verify/{hash}`; Neon Postgres ledger; rate limits and budgets.
- **Depth (Sep 3-4):** multi-intent recipes; second opinion on low confidence; routing visibility
  (which rank served you); hosted MCP (Streamable HTTP) + REST with keys and caps; Daemon
  "what's hot" feed.
- **Stretch (only if the MVP is stable by Sep 4 evening):** ERC-8183 anchoring of a verdict;
  a Discord bot if the organizers welcome one; capped, labelled watches.
- **Not building:** our own miners, mock data, accounts/login, mainnet, a mobile app.

Details: [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [PHASES.md](PHASES.md).

## Schedule (UTC)

| Day | Build (Claude) | Operator |
|---|---|---|
| **Sep 2** | plan + repo (done); core `ask`, Telegram bot, web skeleton, ledger; deploy | burner wallet + faucet, BotFather token, Vercel project + Neon, env vars; **X post 1** |
| **Sep 3** | ledger UI, verify page, recipes, second opinion, error paths, tests | share in Telegraph Discord, X, own groups; **X post 2** (first real numbers) |
| **Sep 4** | hosted MCP + REST + keys, docs, Playwright judge journey, alarms | **X post 3** (MCP in one line); reply to every user |
| **Sep 5 18:00** | **feature freeze** — then bugfixes, DEMO.md, README, gif/video | distribution push |
| **Sep 6** | rehearsal, submission dry run, stretch only with zero open P1s | **X thread** with ledger numbers |
| **Sep 7** | final checks, keep it up | final numbers post; **submit before 23:59 UTC**; confirm it shows |

## What needs the operator, in order

1. **New burner EVM wallet** — never the miner wallet (its seed is compromised: miner repo GAPS
   G19). Fund it at <https://faucet.circle.com> (Base Sepolia USDC, 20 per 2h per address). No ETH
   should be needed: x402 uses EIP-3009 `TransferWithAuthorization`, the facilitator pays gas —
   confirmed on the first paid call (GAPS G2).
2. **Telegram bot** via @BotFather; copy the token.
3. **Vercel** project from this repo, Neon Postgres from the Vercel Marketplace, env vars from
   [.env.example](.env.example). Claude never sees or sets the private key.
4. **X posts** from [docs/X_POSTS.md](docs/X_POSTS.md), tagged @Telegraphprotoc.
5. **Discord**: share the bot; ask whether a Discord bot is welcome; transcribe the exact Track 3
   deadline from `#announcements` into docs/TELEGRAPH_FACTS.md.
6. **Submit** at <https://submissions.telegraphprotocol.com> when the Track 3 tab opens.

## Tooling: MCP servers and plugins for the Claude Code desktop app

Recommended, in priority order. Config with env placeholders is in [.mcp.json](.mcp.json); copy
the secrets into your shell or Vercel env, never into the file.

| # | Connect | Why it matters here | How |
|---|---|---|---|
| 1 | **Telegraph MCP** (`npx -y telegraph-protocol-mcp`) | Claude can query the live network while building: test intents, inspect miner output shapes, craft recipes, reproduce user bugs. Needs the burner key in env (`TELEGRAPH_EVM_PRIVATE_KEY`). | in `.mcp.json` |
| 2 | **Vercel MCP** (`https://mcp.vercel.com`) | read deployment logs and env-var *names* without leaving the session; the fastest way to debug a webhook in production | `claude mcp add --transport http vercel https://mcp.vercel.com` |
| 3 | **Neon MCP** (`https://mcp.neon.tech/mcp`) | run SQL against the ledger to answer "how many real users today" precisely; verify migrations | `claude mcp add --transport http neon https://mcp.neon.tech/mcp` |
| 4 | **Playwright MCP** (`npx @playwright/mcp@latest`) | drive the judge journey end to end in a real browser; the framework requires it | in `.mcp.json` |
| 5 | **Context7 MCP** (`https://mcp.context7.com/mcp`) | current docs for grammY, Hono, viem, `@x402/*`, MCP SDK — the x402 docs already drifted once | `claude mcp add --transport http context7 https://mcp.context7.com/mcp` |
| 6 | **GitHub MCP** (`https://api.githubcopilot.com/mcp/`) | optional; `gh` CLI already covers issues/PRs here | skip unless you want PR review inline |

Plugins from the official marketplace (`/plugin` → browse `claude-plugins-official`; verify the
name there before installing): `frontend-design` (landing page quality for the 25% usefulness
axis), `code-review` and `security-guidance` (the paid endpoints and key handling), `commit-commands`
(one task = one commit). Already enabled: `claude-code-setup`.

Not recommended: any X/Twitter posting MCP. Posting is the operator's action by rule; Claude drafts.

## Docs

[PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PHASES.md](PHASES.md) · [GAPS.md](GAPS.md)
· [MEMORY.md](MEMORY.md) · [DEMO.md](DEMO.md) · [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md)
· [docs/X_POSTS.md](docs/X_POSTS.md)
