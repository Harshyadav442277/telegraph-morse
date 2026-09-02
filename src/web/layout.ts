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
.lede{font-size:18px;color:var(--muted);max-width:720px;margin:0 0 24px}
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
`;

export function page(title: string, body: string, opts: { description?: string } = {}): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(opts.description ?? "Ask Telegram, get a receipt from the Telegraph network.")}">
<style>${CSS}</style></head><body><main>
<header class="top"><h1><a href="/" style="color:inherit">M<span>·</span>O<span>·</span>R<span>·</span>S<span>·</span>E</a></h1>
<nav><a href="/#ledger">Ledger</a><a href="/keys">API &amp; MCP</a><a href="https://github.com/Harshyadav442277/telegraph-morse">GitHub</a><a href="https://telegraphprotocol.com">Telegraph</a></nav></header>
${body}
<footer>Morse is a Telegraph Hackathon Season I Track 3 application. Every answer is a live, paid call to a Telegraph miner. Nothing is mocked or cached. Testnet (Base Sepolia).</footer>
</main></body></html>`;
}
