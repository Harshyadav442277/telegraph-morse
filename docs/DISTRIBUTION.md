# DISTRIBUTION.md — raising real routed traffic without asking anyone

Written 2026-09-05 15:55 UTC. The question was: "what can I do on my own to raise Morse's share of
routed traffic?" The measured position that day: the network did 6,550 user-paid calls in 24 h,
64% direct and 36% routed; about ten wallets use the router, mostly agents on a timer; Morse was
about 1% of routed calls, 30 asks, all answered.

## The line that cannot be crossed

Rule 04: "Artificial inflation of metrics or gaming the system will result in disqualification."
Every Morse call is on a public ledger with a salted identity, every payment is on chain from one
wallet, and the organisers read both. So none of these, ever:

- a cron, a loop, a "keep-warm" ask, or running the paid journey on a schedule
- asking questions yourself from several accounts, keys or devices to look like several people
- a bot in a group you control, fed by your own messages
- recipes tuned to fire more legs than the question needs

What *is* fine: a real question you actually wanted answered, from your own account, disclosed as
yours (the ledger already shows it). That is volume, not users, and it should never be dressed up
as adoption.

## What one person can do alone, ranked by real calls per hour of effort

### 1 · Publish the MCP server on the official registry — 20 minutes, done once

Agents and their owners find servers there; Telegraph itself and the rival `amanat` are already
listed, Morse is not. `server.json` is at the repo root, written against the 2025-12-11 schema
as a remote streamable-HTTP server with a bearer header. Publishing needs a GitHub login, which is
yours:

```bash
npm install -g @modelcontextprotocol/publisher
```

```bash
cd telegraph-morse && mcp-publisher login github
```

```bash
mcp-publisher publish
```

Then confirm it is listed:

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=morse"
```

The name `io.github.Harshyadav442277/telegraph-morse` is tied to your GitHub account, which is
why the login is required. Bump `version` in `server.json` if you republish.

### 2 · Make the bot findable in Telegram — 10 minutes in BotFather, no code

Telegram search and the bot's preview page use fields the code never sets. In BotFather:
`/setdescription` (the long text shown before Start), `/setabouttext` (the short text on the
profile), `/setuserpic`, and `/setcommands` — which also fixes the menu that still lists the two
removed commands. Copy for the description:

> Ask the Telegraph network anything: certificates, link safety, weather, storm risk, crypto and
> stock prices, wallet balances, fact checks, translation. Telegraph's own router picks the
> best-ranked miner, Morse pays the fee, and every answer comes with a receipt you can check on
> chain. No wallet, no sign-up. Add me to a group and I answer when mentioned.

About text: `Telegraph in Telegram. Ask, get an answer from a ranked miner, with a receipt.`

### 3 · Get listed where MCP users browse — an hour, once

Each of these is a form or a pull request, not a conversation: Smithery, Glama, PulseMCP, mcp.so,
the Cursor MCP directory, and the `awesome-mcp-servers` list on GitHub. Their submission steps
were not verified on 2026-09-05; check each site. Use the same one-paragraph description as
`server.json`.

### 4 · Use it for the questions you already ask every day — ongoing, honest

Certificate checks for the miner's own domains, storm risk where you are, the prices you look up
anyway, translations you need. From your own Telegram account and from Claude Code through the MCP
server. Real questions, real receipts, your identity in the ledger. It raises routed volume and it
is exactly what the ledger says it is. It does not raise users, and the X posts must not count it.

### 5 · Post the X drafts — the only route to strangers that is not a conversation

Every draft links the bot. Drafts 1, 2, 4 and 11 are the ones that bring a stranger to the ask
box. See docs/X_TO_POST.md.

## Product changes that would raise routed calls per real question — freeze decisions, not done

- **Route recipe legs through Telegraph's router.** Today `/safe`, `/wallet`, `/weather` and
  `/fact` pass `skipGuard = true`, so every leg is a direct call and counts as *direct* traffic
  (GAPS G34). Sending each leg as its own natural-language question through `/engine/v1/ask`
  would make a human recipe two or three *routed* calls. Cost: the router fails about a quarter of
  the time network-wide and adds latency; recipes would need the free-failure retry. Paid journey
  after.
- **Inline mode** (`@MyMorse_Bot <question>` in any chat without adding the bot): a real
  distribution feature Telegram supports, one handler, but new code during the freeze.
- **A subscribed brief** (`/watch storm Chennai`, one routed call a day per subscription, posted
  back): the "persistent intelligence" high-value area, with a human opt-in behind every call.
  Rule 04 exposure is real and was deliberately not built (GAPS G11, G28). If ever built, cap
  subscriptions per identity, make every call traceable to the subscribing person, and say so on
  the page.
