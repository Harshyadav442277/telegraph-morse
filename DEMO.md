# DEMO.md — exact steps, exact expected output

**Status: not yet runnable.** Nothing below is verified until P1 ships; every "expected" line is
replaced with the real output when it is. Until then this is the judge journey we are building to.

## Judge journey (target: under 3 minutes, no wallet needed)

1. Open `https://<host>/`.
   Expected: counters for users, calls, intents, miners served, USDC spent; the payer address; a
   table of the most recent calls, each with miner, intent, confidence, cost, latency and a
   **verify** link; a Telegram button.
2. Type `Is the TLS certificate for github.com valid?` in the ask box.
   Expected within ~15s: an answer card — served by `<miner>` (rank #k for SSL_VERIFICATION),
   confidence, `$0.01`, `NNN ms`, `signal_hash 0x…`, verify link.
3. Click verify.
   Expected: the node's record for that hash, `wallet_address` equal to the payer shown on `/`,
   the USDC transfer `tx_hash` linked to sepolia.basescan.org, and the payload the hash covers.
4. Open the Telegram bot, send `/safe https://example.com`.
   Expected: "asking the network…" edited into a combined verdict with three receipts
   (URL_SCAN, SSL_VERIFICATION, IP_GEOLOCATION).
5. In Claude Code: `claude mcp add --transport http morse https://<host>/mcp` with a key from
   `/keys`, then ask Claude "what is the ETH balance of vitalik.eth on Base?".
   Expected: a tool call `telegraph_ask` returns the answer with a receipt; the call appears at
   the top of the ledger on `/` within seconds.

## Fresh clone and dead network

```bash
git clone https://github.com/Harshyadav442277/telegraph-morse && cd telegraph-morse
npm ci && npm test        # unit tests run offline; live tests are skipped without a key
npm run dev               # serves / with the docs and an empty ledger; asking fails honestly
```

With no network, the site renders and says the network is unreachable; it never shows a canned
answer (ARCHITECTURE A10).
