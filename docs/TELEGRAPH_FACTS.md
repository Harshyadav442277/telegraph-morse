# TELEGRAPH_FACTS.md — verified facts for a Track 3 application

Rule: verify against live sources, never memory. Every fact carries a source and a date.

## Track 3 judging — hackathon.telegraphprotocol.com/rules, "Track 3: Applications" tab (read 2026-09-02 07:50 UTC)

| Weight | Criterion | Verbatim |
|---:|---|---|
| **45%** | Real Usage & Adoption | "Number of real users + actual volume of Telegraph calls made by your application." |
| **25%** | Usefulness, Creativity & Depth of Integration | "How useful and creative the application is, and how deeply it leverages Telegraph's intelligence layer (off-chain and on-chain)." |
| **25%** | Engagement & Updates on X | "Quality, reach, and meaningful engagement of updates posted on X. Tag @Telegraphprotoc in all update posts." |
| **5%** | Technical Execution & Integration Quality | "Cleanliness and reliability of the integration with Telegraph." |

Prizes: Application track $2,000 ($1,000 / $600 / $400). Track 3 window Aug 31 – Sep 7; winner
selection Sep 8–18; announcement Sep 19–25. The tab content is client-rendered; a text dump of
the page shows only Track 1's criteria.

Rules (verbatim, same page): 01 "Applications in Track 3 must use real Telegraph Miners.
Simulated or mocked data is not allowed." 03 "All updates used for judging must be publicly
posted on X and properly tagged." 04 "Artificial inflation of metrics or gaming the system will
result in disqualification." 06 "All participants must join the official Hackathon Discord …
Staying active in the Discord is expected."

"High-Value Areas": on-chain intelligence pipelines; autonomous agents & workflows; multi-intent &
cross-domain; confidence thresholds & routing behaviour; signal quality & verification; real-time
streaming & persistent intelligence. "Surface-level integrations will not stand out."

Organizer (Discord, 2026-08-30, via operator): Track 3 requests route to higher-ranked miners
"and those requests will be counted when submissions are being judged".

## Client API surface — docs.telegraphprotocol.com (pages dated Aug 13–20 2026, read 2026-09-02)

Base: `https://devnode.telegraphprotocol.com`. Engine `/engine`, Daemon `/daemon`, same host.

- `POST /engine/v1/ask` `{query, context?}` → `{miner_id, miner_name, endpoint, result, cost_usd,
  duration_ms, timestamp, reasoning?, intent?, signal_hash?, warnings?}`. Auto-routed; never blocked
  by pre-request validation (warnings attached instead).
- `POST /engine/v1/ask/{minerId}` `{method, endpoint, payload, acknowledge_warnings?}` → same
  minus `reasoning`/`intent`. 422 (unpaid) when the node predicts failure.
- `GET /engine/v1/signal/{hash}` → `{signal_hash, kind, signal:{wallet_address, miner_slug,
  subnet_id, tx_hash, result_id, created_at}, payload:{request, response, …}, result}` — **carries
  the payer wallet and the settlement tx** (verified live 2026-09-02 on a `direct_result`).
- `GET /api/miners[?intent=&status=&limit=]` — catalogue: numeric `id`, `slug`, `endpoints`,
  `input_schema`, `output_schema`, `signal_mapping{confidence_field,label_field,reason_field}`,
  `supported_intents`, `activation_status`, `min_price_usdc`, `total_requests_served`, `scores[]`
  (latest epoch rank/score per intent). 129 active miners on 2026-09-02.
- `GET /engine/v1/intents` — 45 canonical intents with `miner_count`;
  `GET /engine/v1/intents/{ID}/miners`.
- `GET /engine/v1/miners` — client-facing list with `capabilities` and `cost_per_call`.
- `GET /miner-dispatcher/openapi.json` — 2.26 MB OpenAPI of every miner endpoint.
- Daemon (free, CORS `*`): `GET /daemon/api/questions[?category&source&sort&since_hours&
  min_interest&limit&offset]`, `/daemon/api/questions/top`, `/daemon/api/categories`,
  `/daemon/health`. **`source=user` returns engine traffic that agents paid for**, network-wide:
  771 rows in 24h, 1,031 in 72h, 1,811 in 168h at 2026-09-02 07:45 UTC.
- WebSocket `wss://devnode.telegraphprotocol.com/engine/ws?wallet_address=`: `auth_wallet` →
  `personal_sign` → requires ≥ 1.00 USDC in the Diamond escrow (`EscrowFacet.depositUSDC`);
  `subscribe {intents, spend_limit_usdc}` pushes Daemon signals; `ask`/`ask_direct` free of x402.
- ERC-8183 jobs: `createJob(bytes32 intentId, OnChainData, callback)` on the Diamond, priced by
  `getJobBasePrice()` = 1 USDC on testnet from escrow; callback `subnetMessage(...)` is optional,
  must be cheap, reverts swallowed; failed jobs stay `Funded` → `cancelJob`.
- On-chain miner requests: `outboundSubnetMessage(subnetId, endpoint, OnChainData, callback)`, gas
  only, callback mandatory, one outstanding request protocol-wide, ~3 min end to end.
- Explorer: `GET https://explorer.telegraphprotocol.com/api/scores?miner_slug=&epoch_id=&limit=`
  and `/api/epoch` (epochs are 9h; epoch 301 on 2026-09-02).

## Payment — x402 (docs read 2026-09-02; 402 re-verified live 08:05 UTC)

Unpaid `POST /engine/v1/ask` → 402 with `Payment-Required` header (base64 JSON) and body
`accepts:[{scheme:"exact", price:"$0.01", network:"eip155:84532", payTo: Diamond
0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8}, {solana…}]`. USDC Base Sepolia
`0x036CbD53842c5426634e7929541eC2318f3dCF7e`. Amount = `min_price_usdc × demand multiplier`
(1.0× under 1,000 req/24h per intent, 1.5× to 9,999). Settles only on 2xx; failed calls are free.
Client: `@x402/fetch` + `@x402/evm` (2.24.0 on npm, 2026-09-02); Node ≥ 20. The docs' `createSigner`
example is drifted from the shipped exports — read the `.d.ts`. Facilitator
`https://facilitator.payai.network`. Faucet: <https://faucet.circle.com>, 20 USDC / 2h / address.

## Reference apps and tooling (read 2026-09-02)

- `github.com/telegraphprotocol/telegraph-usecases`: TruthWire, TrustFilter, ScholarGuard,
  ReviewRadar, AdGuard, Polymarket bot, SuperSignal — built on the older subnet API (Solana/Polygon
  x402). Useful as taste, not as code.
- `telegraph-protocol-mcp` 1.0.0 on npm (`npx -y telegraph-protocol-mcp`), repo
  `telegraphprotocol/telegraph-mcp`: local stdio MCP, pays x402 from `TELEGRAPH_EVM_PRIVATE_KEY`,
  tools `tg_engine_ask`, `tg_engine_ask_subnet`, `tg_daemon_*`, `tg_node_*`, plus one dynamic tool
  per miner endpoint. Its npm README still points at raw IP URLs; use the devnode URLs.
- Live leaderboard (integrate.telegraphprotocol.com, 2026-09-02): `livecert` (the operator's Track
  1 miner) is #1 in 7 intents: ACADEMIC_SEARCH, CONTENT_EXTRACTION, LANGUAGE_TRANSLATION,
  NEWS_HEADLINES, STORM_ALERT, TELEGRAPH_KNOWLEDGE, WALLET_BALANCE_CHECK.

## Submission (read 2026-09-02)

`https://submissions.telegraphprotocol.com` — tabs "TRACK 1 — MINER", "TRACK 2 — WASM",
"**TRACK 3 — COMING SOON**". Wallet connect required to submit. Field list for Track 3 unknown.
