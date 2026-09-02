import { escapeHtml as h, page } from "./layout.js";

export function keysPage(d: { publicUrl: string | undefined; dailyCap: number }): string {
  const base = d.publicUrl ?? "https://<this-host>";
  const body = `
<h2>Telegraph for agents, no wallet needed</h2>
<p class="lede">Morse hosts an MCP server and a REST endpoint that pay the x402 fee for you. Get a free key, paste one line into your agent, and every call lands in the <a href="/#ledger">public ledger</a> with its receipt.</p>

<section class="panel"><h2>1. Get a key</h2>
<form id="kf" class="ask"><input id="label" placeholder="a label for this key (e.g. my-claude-code)" maxlength="60"><button type="submit">Issue key</button></form>
<div id="kout" class="muted" style="margin-top:10px">Keys allow ${d.dailyCap} paid calls per UTC day, three keys per network per day. Shown once.</div></section>

<section class="panel"><h2>2. Claude Code</h2>
<pre>claude mcp add --transport http morse ${h(base)}/mcp --header "Authorization: Bearer morse_…"</pre>
<p class="muted">Then ask Claude anything the network can answer, e.g. <i>"Use telegraph_ask: is the TLS certificate for github.com valid?"</i>. Tools: <code>telegraph_ask</code>, <code>telegraph_recipe</code>, <code>telegraph_verify_signal</code>, <code>telegraph_intents</code>, <code>telegraph_leaderboard</code>, <code>telegraph_hot_signals</code>.</p></section>

<section class="panel"><h2>Cursor / any MCP client (Streamable HTTP)</h2>
<pre>{
  "mcpServers": {
    "morse": { "url": "${h(base)}/mcp", "headers": { "Authorization": "Bearer morse_…" } }
  }
}</pre></section>

<section class="panel"><h2>REST</h2>
<pre>curl -X POST ${h(base)}/v1/ask \\
  -H "Authorization: Bearer morse_…" -H "content-type: application/json" \\
  -d '{"question":"What is the ETH balance of vitalik.eth on Base?"}'

curl -X POST ${h(base)}/v1/ask -H "Authorization: Bearer morse_…" -H "content-type: application/json" \\
  -d '{"recipe":"safe","input":"https://example.com"}'

curl ${h(base)}/v1/intents
curl ${h(base)}/v1/leaderboard/SSL_VERIFICATION</pre>
<p class="muted">Responses carry the answer and the receipt: <code>minerSlug</code>, <code>intent</code>, <code>minerRank</code>, <code>confidence</code>, <code>costUsd</code>, <code>durationMs</code>, <code>signalHash</code>. Verify any hash at <code>/verify/{hash}</code>.</p></section>

<script>
document.getElementById('kf').addEventListener('submit',async e=>{e.preventDefault();const o=document.getElementById('kout');o.textContent='Issuing…';const r=await fetch('/api/keys',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({label:document.getElementById('label').value})});const j=await r.json();o.innerHTML=j.key?'Your key (copy it now, it is shown once):<pre>'+j.key+'</pre>':'<span class="bad">'+(j.error||'failed')+'</span>'});
</script>`;
  return page("API & MCP · Morse", body, { description: "Telegraph for agents without a wallet: hosted MCP and REST." });
}
