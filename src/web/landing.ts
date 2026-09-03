import type { CallRow, Stats } from "../core/ledger/types.js";
import type { Recipe } from "../core/recipes.js";
import { escapeHtml as h, page } from "./layout.js";

export interface LandingData {
  stats: Stats;
  recent: CallRow[];
  ledgerKind: "postgres" | "memory";
  payer: string | null;
  publicUrl: string | undefined;
  botUsername: string | undefined;
  paid: boolean;
  recipes: Recipe[];
}

function row(r: CallRow): string {
  const status = r.status === "ok" ? `<span class="ok">ok</span>` : `<span class="bad">${h(r.status)}</span>`;
  const verify = r.signalHash ? `<a href="/verify/${h(r.signalHash)}"><code>${h(r.signalHash.slice(0, 10))}…</code></a>` : `<span class="muted">—</span>`;
  const conf = r.confidence === null ? `<span class="muted">n/r</span>` : `${(r.confidence * 100).toFixed(0)}%`;
  return `<tr><td class="mono muted">${h(r.at.replace("T", " ").slice(0, 19))}Z</td><td>${h(r.channel)}</td><td>${h(r.kind)}</td><td>${h(r.intent ?? "—")}</td><td>${h(r.minerSlug ?? "—")}${r.minerRank ? ` <span class="badge">#${r.minerRank}</span>` : ""}</td><td>${conf}</td><td>${r.costUsd !== null ? `$${r.costUsd.toFixed(2)}` : "—"}</td><td>${r.durationMs ?? "—"}</td><td>${status}</td><td>${verify}</td></tr>`;
}

export function landingPage(d: LandingData): string {
  const s = d.stats;
  const chips = d.recipes.map((r) => `<button type="button" data-recipe="${h(r.name)}" title="${h(r.description)}">${h(r.usage)}</button>`).join("");
  const body = `
<p class="lede">Ask a question. Morse works out the intent, calls the best-ranked live miner for it, pays the x402 fee, and gives you the answer <b>with a receipt</b>: who answered and at what rank, how confident they were, what it cost, the on-chain settlement, and a signal hash anyone can look up on the node with the payer wallet checked against ours.</p>
${d.paid ? "" : `<div class="panel warn"><b>Morse is not funded yet.</b> The payer wallet or daily budget is not configured, so asking is disabled until the operator funds it. Everything else on this page is live.</div>`}
<section class="panel"><h2>Ask the network</h2>
<form class="ask" id="ask"><input id="q" name="q" placeholder="Is the TLS certificate for github.com valid right now?" maxlength="2000" required><button id="go" type="submit">Ask</button></form>
<div class="chips">${chips}</div>
<div id="out"></div></section>

<section class="grid">
<div class="stat"><b>${s.usersAnswered}</b><span>people answered<br><span class="muted">of ${s.users} who asked</span></span></div>
<div class="stat"><b>${s.okCalls}</b><span>answered calls</span></div>
<div class="stat"><b>${s.intents}</b><span>intents used</span></div>
<div class="stat"><b>${s.miners}</b><span>miners served</span></div>
<div class="stat"><b>$${s.spentUsd.toFixed(2)}</b><span>paid to the network</span></div>
<div class="stat"><b>${s.today.calls}</b><span>calls today · ${s.today.users} users</span></div>
</section>

<section class="panel" id="ledger"><h2>Public ledger <span class="badge">${d.ledgerKind === "postgres" ? "durable" : "ephemeral · dev"}</span></h2>
<p class="muted">Every call Morse makes, newest first. Users are salted hashes and are not shown; "people answered" counts distinct identities that received at least one answer, "who asked" includes attempts that failed. Both include the operator's own testing — this project does not separate its own calls out, and does not manufacture any. Payer wallet: ${d.payer ? `<a href="https://sepolia.basescan.org/address/${h(d.payer)}"><code>${h(d.payer)}</code></a>` : "<i>not configured</i>"}. Cross-check any row at its verify link, or on the node with <code>GET /engine/v1/signal/{hash}</code>.</p>
<div class="tablewrap"><table><thead><tr><th>time (UTC)</th><th>channel</th><th>kind</th><th>intent</th><th>miner</th><th>conf.</th><th>cost</th><th>ms</th><th>status</th><th>verify</th></tr></thead>
<tbody>${d.recent.length ? d.recent.map(row).join("") : `<tr><td colspan="10" class="muted">No calls yet.</td></tr>`}</tbody></table></div>
<p class="muted">JSON: <a href="/api/stats">/api/stats</a> · <a href="/api/recent">/api/recent</a> · <a href="/api/health">/api/health</a></p></section>

<section class="panel"><h2>How routing works</h2>
<p>Telegraph ranks miners per intent from validator scores every 9-hour epoch. Morse reads that live leaderboard, works out which of the 45 canonical intents your question belongs to, and calls the best-ranked active miner for it directly — every receipt states which rule matched and which rank answered, so the routing is inspectable rather than implied. Morse does <i>not</i> use the network's own <code>POST /engine/v1/ask</code> router: its settlement step takes about 47 seconds to time out, which does not fit in a serverless function, while a direct miner call settles in about four. That is a real trade — the network's classifier is smarter than a keyword rule — and it is written down in <a href="https://github.com/Harshyadav442277/telegraph-morse/blob/main/GAPS.md">GAPS</a> rather than glossed over. When a miner reports low confidence, or when you ask, Morse fetches a <b>second opinion</b> from the next-ranked miner. Recipes fan one question out to several intents and combine the receipts.</p>
<p>Also in Telegram: ${d.botUsername ? `<b><a href="https://t.me/${h(d.botUsername)}">@${h(d.botUsername)}</a></b>` : "<b>not connected yet</b> — the bot goes live when the operator sets its token"}. For agents: <a href="/keys">hosted MCP and REST, no wallet needed</a>.</p></section>

<script>
const form=document.getElementById('ask'),q=document.getElementById('q'),out=document.getElementById('out'),go=document.getElementById('go');
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function receipt(r){if(!r)return'';const v=r.signalHash?' · <a href="/verify/'+r.signalHash+'">verify <code>'+r.signalHash.slice(0,10)+'…</code></a>':'';const tx=r.settlementTx?' · <a href="https://sepolia.basescan.org/tx/'+r.settlementTx+'">paid on-chain</a>':'';const c=r.confidence===null?'confidence not reported':(r.confidenceIsRisk?'risk ':'confidence ')+Math.round(r.confidence*100)+'%'+(r.confidenceIsRisk?' (miner metric)':'');return'<div class="receipt">served by <b>'+esc(r.minerSlug||'?')+'</b>'+(r.minerRank?' #'+r.minerRank:'')+(r.intent?' for '+esc(r.intent):'')+' · '+c+' · '+(r.costUsd!=null?'$'+r.costUsd.toFixed(2):'')+' · '+(r.durationMs||'')+' ms'+v+tx+'</div>'}
function second(r){return'<div style="margin-top:10px"><b>Second opinion</b><br>'+esc(r.answer)+receipt(r)+'</div>'}
function card(c){if(!c.ok||!c.receipt)return'<div class="card bad">'+esc(c.error||'no answer')+'</div>';let s='<div class="card">'+esc(c.receipt.answer)+receipt(c.receipt);if(c.second)s+=second(c.second);else if(c.receipt.signalHash&&c.receipt.intent)s+='<div style="margin-top:10px"><button class="so" data-so="'+c.receipt.signalHash+'">Second opinion from the next-ranked miner</button></div>';return s+'</div>'}
async function run(body){go.disabled=true;out.innerHTML='<div class="card muted">Asking the Telegraph network…</div>';try{const r=await fetch('/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(j.cards){out.innerHTML='<div class="card"><b>'+esc(j.recipe)+'</b> · '+esc(j.subject||'')+'<br>'+esc(j.verdict||j.error||'')+'</div>'+j.cards.map(card).join('')}else out.innerHTML=card(j)}catch(e){out.innerHTML='<div class="card bad">'+esc(e.message)+'</div>'}go.disabled=false}
form.addEventListener('submit',e=>{e.preventDefault();run({question:q.value})});
document.querySelectorAll('[data-recipe]').forEach(b=>b.addEventListener('click',()=>{const v=prompt(b.title+'\\n\\nInput for '+b.dataset.recipe+':');if(v)run({recipe:b.dataset.recipe,input:v})}));
out.addEventListener('click',async e=>{const b=e.target.closest('[data-so]');if(!b)return;b.disabled=true;b.textContent='Asking the next-ranked miner…';try{const r=await fetch('/api/second',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hash:b.dataset.so})});const j=await r.json();const d=document.createElement('div');if(j.second){const who=j.first?esc(j.first.minerSlug||'?')+(j.first.minerRank?' #'+j.first.minerRank:''):'the first miner';d.innerHTML='<div class="receipt">compared against '+who+'</div>'+second(j.second)}else{d.innerHTML='<div class="receipt bad">'+esc(j.error||'no second opinion')+'</div>'}b.replaceWith(d)}catch(err){b.textContent=String(err.message)}});
</script>`;
  return page("Morse · ask Telegram, get a receipt from the Telegraph network", body);
}
