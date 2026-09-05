/** Shared HTML shell. One inline stylesheet, no build step, readable in both themes. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const CSS = `
:root{--bg:#0b0f14;--panel:#121821;--line:#1f2a37;--fg:#e6edf3;--muted:#8b98a5;--accent:#f5b700;--ok:#3fb950;--warn:#f0883e;--bad:#f85149;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme: light){:root{--bg:#fbfaf6;--panel:#ffffff;--line:#e6e2d6;--fg:#1a1f26;--muted:#5f6b78;--accent:#b8860b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
main{max-width:980px;margin:0 auto;padding:32px 20px 64px}
header.top{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px}
header.top h1{font-size:28px;margin:0;letter-spacing:.5px}header.top h1 span{color:var(--accent)}
header.top nav a{margin-left:16px;color:var(--muted)}
.lede{font-size:22px;color:var(--fg);max-width:720px;margin:0 0 10px;line-height:1.35}
.sub-lede{font-size:16px;color:var(--muted);max-width:720px;margin:0 0 16px}
.cta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 20px}
a.tg{display:inline-block;background:var(--accent);color:#111;font-weight:700;padding:12px 18px;border-radius:8px}
a.tg:hover{text-decoration:none;filter:brightness(1.08)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.stat b{display:block;font-size:26px;font-variant-numeric:tabular-nums}.stat span{color:var(--muted);font-size:13px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:18px 0}
.panel h2{margin:0 0 10px;font-size:17px}
form.ask{display:flex;gap:10px;flex-wrap:wrap}form.ask input{flex:1;min-width:240px;padding:12px 14px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font-size:16px}
button{padding:12px 18px;border-radius:8px;border:0;background:var(--accent);color:#111;font-weight:600;cursor:pointer}button[disabled]{opacity:.6;cursor:wait}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.chips button{background:var(--panel);color:var(--fg);border:1px solid var(--line);padding:6px 10px;font-weight:500;font-size:13px}
.card{border-left:3px solid var(--accent);padding:12px 16px;margin-top:14px;background:var(--bg);border-radius:0 8px 8px 0;white-space:pre-wrap;word-break:break-word}
.receipt{color:var(--muted);font-size:13px;margin-top:8px}.receipt code{font-family:var(--mono)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}
td.mono,code,pre{font-family:var(--mono);font-size:12.5px}pre{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}.muted{color:var(--muted)}
.tablewrap{overflow-x:auto}footer{color:var(--muted);font-size:13px;margin-top:40px}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--muted)}

.hero{border-color:var(--accent)}.hero .q{font-size:16px;color:var(--muted);margin:0 0 8px;font-style:italic}
.latest{border:1px solid var(--accent);border-radius:10px;padding:14px 16px;margin:0 0 14px}.latest h3{margin:0 0 8px;font-size:14px;font-weight:600}.latest .card{max-height:8.5em;overflow:auto}
.rcpt{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:10px 0 0;font-size:13px}.rcpt dt{color:var(--muted)}.rcpt dd{margin:0;word-break:break-word}
.chips .ex{border-color:var(--accent)}.chips span.muted{align-self:center;font-size:13px}
.groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px 24px;margin-top:10px}.groups h3{font-size:14px;margin:8px 0 4px}.groups ul{margin:0;padding-left:18px}.groups li{margin:3px 0;font-size:14px}
details{margin:6px 0}details summary{cursor:pointer;padding:6px 0}details p{margin:4px 0 8px 0;color:var(--fg)}
nav span.nl{display:inline-flex;align-items:center;gap:4px}
button.q{padding:0;width:18px;height:18px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:11px;font-weight:600;line-height:16px;cursor:pointer}
button.q[aria-expanded="true"],button.q:hover{border-color:var(--accent);color:var(--accent)}
.help{margin:8px 0 14px;padding:12px 16px;border:1px solid var(--accent);border-radius:10px;background:var(--panel);font-size:14px;max-width:720px}
.help h3{margin:0 0 6px;font-size:14px}.help dt{font-weight:600;margin-top:8px}.help dd{margin:2px 0 0;color:var(--muted)}.help dd a{color:var(--accent)}
`;

/** Questions people ask before they trust a page. One entry per nav item; shown on the ? next to it. */
const HELP: Record<string, { title: string; qa: Array<[string, string]> }> = {
  ledger: {
    title: "The public ledger",
    qa: [
      ["What is this list?", "Every call Morse has ever made to the Telegraph network, newest first, including the operator's own testing. Nothing is separated out and nothing is manufactured."],
      ["What does the routed column mean?", "<b>Telegraph</b>: Telegraph's own router picked the miner. <b>Morse (named miner)</b>: you named the miner, so Morse dispatched to it directly. <b>Morse (fallback)</b>: the router did not answer within 20 s and Morse routed the question itself. Older rows also read <b>Morse (podium)</b> and <b>(2nd opinion)</b> — two features retired on 4 September; the rows stay because history is not rewritten."],
      ["Is my question public?", "Yes, clipped to 200 characters, with the answer excerpt. Who asked is stored only as a salted hash. Do not type anything private."],
    ],
  },
  proof: {
    title: "On-chain proof",
    qa: [
      ["What does it prove?", "That the calls in the ledger happened and were paid: every settlement hash the ledger holds is matched against the payer wallet's USDC transfers on Base Sepolia, read from a public block explorer, not from Morse."],
      ["What is a chain-only settlement?", "A payment the chain shows but the ledger does not: usually a call Morse recorded as timed out that the node settled anyway. They are listed, not hidden, and not counted as answered calls."],
      ["Why does this matter?", "Because \"people used it\" is otherwise a claim. Here it is a number anyone can recompute from the chain."],
    ],
  },
  keys: {
    title: "API and MCP",
    qa: [
      ["Do I need a wallet?", "No. Morse's own wallet pays the x402 fee for every call. Get a free key on this page; each key has a daily cap so the budget cannot be drained by one caller."],
      ["How do I use it from Claude Code or Cursor?", "One command adds Morse as an MCP server: <code>claude mcp add --transport http morse https://telegraph-morse.vercel.app/mcp --header \"Authorization: Bearer morse_YOURKEY\"</code>. The tools cover asking the network, asking a named miner, running a recipe, and free discovery."],
      ["Can I call a specific miner?", "Yes: the <code>miner</code> field on REST, <code>telegraph_ask_miner</code> over MCP, <code>/miner &lt;slug&gt; &lt;question&gt;</code> in Telegram. The receipt says routing was bypassed at your request."],
    ],
  },
  github: {
    title: "The source",
    qa: [
      ["Is the code open?", "Yes: the whole app, its tests, and an honest limits ledger (GAPS.md) that names what is unverified or deliberately not built."],
      ["Can I run my own Morse?", "Yes. It needs a burner wallet with testnet USDC and a Telegram bot token; the README and GO-LIVE.md walk through it. Never reuse a wallet that holds anything real."],
    ],
  },
  telegraph: {
    title: "Telegraph",
    qa: [
      ["What is Telegraph?", "A marketplace where independently run APIs, called miners, answer questions; validators score and rank them per intent; and every answer is paid for per call over x402, about $0.01 in USDC."],
      ["Is this real money?", "No. Everything here runs on the Base Sepolia testnet with faucet USDC. The mechanics are real; the money is not."],
      ["Where does the $0.01 go?", "To the protocol's Diamond contract, and only when the miner actually answers. Failed calls are not charged, and every paid call gets a signal hash you can look up on the node."],
    ],
  },
};

function helpPanels(): string {
  return Object.entries(HELP)
    .map(([k, v]) => `<div class="help" id="help-${k}" hidden><h3>${escapeHtml(v.title)}</h3><dl>${v.qa.map(([q, a]) => `<dt>${escapeHtml(q)}</dt><dd>${a}</dd>`).join("")}</dl></div>`)
    .join("");
}

function navItem(href: string, label: string, key: string): string {
  return `<span class="nl"><a href="${href}">${label}</a><button class="q" type="button" data-help="${key}" aria-controls="help-${key}" aria-expanded="false" aria-label="Questions about ${escapeHtml(label.replace(/&amp;/g, "&"))}">?</button></span>`;
}

const HELP_SCRIPT = `<script>
document.querySelectorAll('button.q').forEach(function(b){b.addEventListener('click',function(){
  var k=b.dataset.help,p=document.getElementById('help-'+k),open=!p.hidden;
  document.querySelectorAll('.help').forEach(function(x){x.hidden=true});
  document.querySelectorAll('button.q').forEach(function(x){x.setAttribute('aria-expanded','false')});
  if(!open){p.hidden=false;b.setAttribute('aria-expanded','true')}
})});
</script>`;

export function page(title: string, body: string, opts: { description?: string } = {}): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="description" content="${escapeHtml(opts.description ?? "Telegraph in Telegram. Ask, get an answer from a ranked miner, with a receipt.")}">
<style>${CSS}</style></head><body><main>
<header class="top"><h1><a href="/" style="color:inherit">M<span>·</span>O<span>·</span>R<span>·</span>S<span>·</span>E</a></h1>
<nav>${navItem("/#ledger", "Ledger", "ledger")}${navItem("/proof", "Proof", "proof")}${navItem("/keys", "API &amp; MCP", "keys")}${navItem("https://github.com/Harshyadav442277/telegraph-morse", "GitHub", "github")}${navItem("https://telegraphprotocol.com", "Telegraph", "telegraph")}</nav></header>
${helpPanels()}
${body}
${HELP_SCRIPT}
<footer>Morse is a Telegraph Hackathon Season I Track 3 application. Every answer is a live, paid call to a Telegraph miner. Nothing is mocked or cached. Testnet (Base Sepolia).</footer>
</main></body></html>`;
}
