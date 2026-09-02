# X_POSTS.md — drafts for @hyadav42774, tagged @Telegraphprotoc

25% of the Track 3 score. One post per real milestone, each carrying a number or a screenshot that
is **true at posting time**. Claude drafts; the operator posts. Never post a key, a token, or a
`.env`.

**Before posting anything with a number in it, run:**

```bash
node scripts/x-numbers.mjs
```

It prints Morse's live counters and the network context, so no draft ever goes out with a stale
figure. Placeholders below are written as `«NAME»` — every one of them is a field that script
prints. A draft with an unfilled `«…»` is not ready to post.

Character counts are the draft body only, excluding the URL (X counts any URL as 23).

---

## Post 1 — the idea and the gap (ready now; nothing in it depends on the wallet)

Every number here was verified on 2026-09-02 15:16 UTC via `scripts/x-numbers.mjs`.

> Using @Telegraphprotoc means a wallet, a faucet and an x402 client. So its 878 user-paid calls
> in the last 24h come almost entirely from developers.
>
> Morse is the front door: ask in plain language, Morse pays, and you get a receipt you can
> verify on-chain.

*(256 chars + link.)* Attach: a screenshot of the landing page showing the ledger and the six
counters. Link: <https://telegraph-morse.vercel.app>

**Verified inputs:** 878 user-originated calls network-wide in 24h (`/daemon/api/questions?source=user&since_hours=24`),
129 active miners, 45 canonical intents — all read live on 2026-09-02.

## Post 2 — what a receipt is (ready once one real call exists)

> Every Morse answer names the miner that served it, its rank for that intent, its own
> confidence, the cost, and a signal hash.
>
> «MINER» #«RANK» for «INTENT», «CONF»% confident, $«COST», «MS» ms.
>
> Verify it yourself on the node and on Base Sepolia: «VERIFY_URL»

*(≈240 chars + link.)* Attach: the `/verify/{hash}` page, cropped to **Paid by … = Morse's payer
wallet** and the settlement tx.

**Fill from:** the first real receipt on `/#ledger`. Do not post this until a hash actually
resolves.

## Post 3 — developers, no wallet (ready once /mcp answers a paid call)

> Telegraph in Claude Code, no wallet, one line:
>
> claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp
>
> Morse pays the x402 fee, routes through @Telegraphprotoc, and every call lands in a public
> ledger with its receipt. 7 tools, free key at /keys.

*(254 chars as X counts it, the inline URL included.)* Attach: a 15-second screen recording of the tool call in Claude Code, then
the row appearing in the ledger.

**Verified now:** the MCP handshake and all 7 tools answer in production; the paid tool call
itself is what still needs the wallet.

## Post 4 — first real numbers (post with a ledger screenshot)

> Morse, day «N» on @Telegraphprotoc: «USERS_ANSWERED» people asked «CALLS» questions across
> «INTENTS» intents and «MINERS» miners, for $«SPENT» paid to the network.
>
> Not a dashboard number — every row has a signal hash you can check yourself.

*(≈250 chars + link.)* Link: <https://telegraph-morse.vercel.app/#ledger>

**Fill from:** `scripts/x-numbers.mjs`. Post the count of people **answered**, never the count of
people who merely asked — Morse publishes both and the smaller one is the honest headline (GAPS G4).

## Post 5 — the depth post: what the catalogue actually says (ready now, no wallet needed)

Measured over all 129 active miners with `npm run catalogue` on 2026-09-02. Nothing here needs
traffic, a wallet, or permission — it is all in the public `/api/miners`.

> I read all 129 @Telegraphprotoc miners before trusting any of them.
>
> 57% publish a confidence field. 4 publish a *risk* score in it — high means more danger, not
> more certainty. Read naively, a calm forecast looks like an unsure miner.
>
> Morse labels those as risk.

*(264 chars + link.)* This is the strongest post in the set: it is a real finding, it shows the
integration is deep rather than surface-level (the 25% criterion), and it is honest about a trap
rather than boasting.

Second one available immediately, same source:

> Asking a second @Telegraphprotoc miner is harder than it looks.
>
> 22% publish more than one endpoint — degenlens-onchain publishes 33 — and only a quarter of
> those name the intent they serve. Send a fraud question to endpoints[0] and you hit transaction
> lookup.

*(260 chars.)* Both fit inside 280.

**Verified inputs (2026-09-02, `npm run catalogue`):** 129/129 active; 73 declare a
`confidence_field`, 56 declare none; 9 distinct field names; 4 are risk-shaped
(amanat-weather-risk, skywire-storm-alert, elcaro-ipi-detection, vulnfeed-onchain-security);
29 miners publish >1 endpoint, 7 of those name intents in descriptions; 59 accept a
question-shaped key; 5 intents have exactly one miner.

Once there is real traffic, one more candidate: how often the router's #1 pick and the next-ranked
miner disagree, from `kind = 'second-opinion'` rows next to their originals.

## Post 6 — closing thread (Sep 6–7)

1. What Morse is, one line, with the ledger screenshot and the live link.
2. The numbers: «USERS_ANSWERED» people, «CALLS» calls, «INTENTS» intents, «MINERS» miners,
   $«SPENT» — and one sentence on how to verify any of them.
3. The finding from post 5, restated with the final numbers.
4. What Morse deliberately does not claim: testnet, "users" = salted identities, the signal hash
   is shown not re-derived. Link GAPS.md.
5. What we would build next on Telegraph (ERC-8183 anchoring, streaming via the WebSocket).
6. Thanks to @Telegraphprotoc; repo link.

---

## Rules for these posts

- Tag **@Telegraphprotoc** in every one (hackathon rule 03).
- A number in a post must come from `scripts/x-numbers.mjs`, run within the hour.
- Never post a number that counts traffic Morse generated for itself — there is none, and it must
  stay that way (rule 04).
- Screenshots over claims: the ledger and the `/verify` page are the whole argument.
