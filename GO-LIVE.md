# GO-LIVE.md — the operator's runbook

Everything Claude can build is built, deployed and verified. What is left needs a wallet and a bot
token, and **Claude must never touch either** (CLAUDE.md rule 1). This is the exact sequence.

Roughly 15 minutes, most of it waiting on a faucet.

---

## 1 · Make a fresh burner wallet

A **new** wallet, used only by Morse. **Never the Track 1 miner wallet.** Any wallet app will do,
or MetaMask → Add account. You need its **private key** (`0x` + 64 hex characters) and its address.

Nothing else in this repo needs the key. It goes into Vercel once and is never read back.

## 2 · Fund it with testnet USDC

<https://faucet.circle.com> → Base Sepolia → paste the **address** → claim.

- 20 USDC per address per chain, every 2 hours.
- At $0.01 a call that is 2,000 calls; the daily budget is capped at 1,500 anyway.
- You should **not** need Base Sepolia ETH — the x402 facilitator submits the transfer under
  EIP-3009. The first real call is what proves that (GAPS G17). If it turns out gas is needed, a
  Base Sepolia ETH faucet will fix it.

Check it arrived:

```bash
curl -s "https://base-sepolia.blockscout.com/api/v2/addresses/YOUR_ADDRESS/token-balances" | head -c 400
```

## 3 · Make the Telegram bot

Message [@BotFather](https://t.me/BotFather) → `/newbot` → pick a name and a username. Keep two
things: the **token** (`123456789:AA…`) and the **username** (without the `@`).

## 4 · Put all three into Vercel

Each command prompts `? Store as sensitive?` → **yes**, then `? Value?` → **paste, Enter**. The
prompt is interactive on purpose: the secret goes from your clipboard to Vercel, and Claude never
sees it. Do not pipe these from the shell — it would put the key in your shell history.

```bash
npx vercel env add EVM_PRIVATE_KEY production --scope wukong4
```

```bash
npx vercel env add TELEGRAM_BOT_TOKEN production --scope wukong4
```

```bash
npx vercel env add TELEGRAM_BOT_USERNAME production --scope wukong4
```

(`TELEGRAM_BOT_USERNAME` is not a secret — answer **no** to "sensitive" for that one so it can be
read back. It only makes the landing page link the bot.)

## 5 · Preflight — before spending anything

Put the same key in a local `.env` (gitignored) so preflight can derive the payer:

```bash
cp .env.example .env
```

Edit `.env`: set `EVM_PRIVATE_KEY`, and `DAILY_BUDGET_CALLS=1500`. Then:

```bash
npm run preflight
```

It spends nothing. It derives the payer, reads its USDC and ETH balances, fetches the node's 402
challenge **without paying it**, and diffs that challenge against our client — scheme, network,
asset, EIP-712 domain version, price against the client's $1 cap, timeouts. Those seven checks
already pass today; this run adds the wallet ones.

**Only continue if it prints `READY`.**

## 6 · Redeploy

```bash
npx vercel deploy --prod --yes --scope wukong4
```

```bash
curl -s https://telegraph-morse.vercel.app/api/health
```

Expect `"ok":true`, a `payer` address, `payerUsdc` above zero, `paidWorkEnabled":true`,
`"telegram":true`. The open `health-alarm` issue closes itself on the next scheduled probe.

## 7 · Point Telegram at the deployment

`ADMIN_TOKEN` is already in Vercel — read it from the Vercel dashboard, do not paste it into a
shared terminal log.

```bash
curl -X POST https://telegraph-morse.vercel.app/admin/telegram/webhook -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expect `{"ok":true,"webhook":"https://telegraph-morse.vercel.app/telegram/webhook","result":true}`.

## 8 · The first real call — the one that matters

Open the site, ask *"Is the TLS certificate for github.com valid right now, and who issued it?"*

Expect an answer plus a receipt: `served by <miner> #<rank> for SSL_VERIFICATION · confidence NN% ·
$0.01 · NNN ms · verify 0x…`. Click **verify**. The page must show **Paid by … = Morse's payer
wallet** in green and a settlement tx on sepolia.basescan.org.

That single call closes GAPS G17, the second half of G2, and the wallet-gated half of G9.

Then prove the whole journey mechanically:

```bash
MORSE_E2E_PAID=1 npm run e2e
```

Expect **7 passed**. That is the end-to-end verification the project has been waiting on.

## 9 · Post

```bash
npm run x:numbers
```

Then post draft 1 from [docs/X_POSTS.md](docs/X_POSTS.md) — it needs no wallet and is ready now —
and draft 2 with the receipt from step 8. Tag **@Telegraphprotoc** (hackathon rule 03).

---

## If something fails

| symptom | likely cause |
|---|---|
| preflight `FAIL payer key` | `EVM_PRIVATE_KEY` missing from `.env`, or not `0x` + 64 hex |
| preflight `FAIL USDC` | faucet not arrived yet, or funded on the wrong chain — it must be **Base Sepolia** |
| ask returns "no funded wallet" | `DAILY_BUDGET_CALLS` is 0 in Vercel, or the redeploy in step 6 was skipped |
| 402 from the node after paying | the signature was rejected — capture the full response and check GAPS G17 |
| the call times out at 45s | miner latency; `ASK_TIMEOUT_MS` is 45s inside the node's 60s window (GAPS G1) |
| Telegram silent | webhook not registered (step 7), or `TELEGRAM_WEBHOOK_SECRET` mismatch |
| `Key limit reached` on /keys | three keys per network per UTC day (GAPS G18) — use another network or wait |

Nothing in this file should ever be pasted into a commit, an issue, or an X post.
