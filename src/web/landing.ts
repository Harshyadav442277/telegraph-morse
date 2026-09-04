import type { Example } from "../core/examples.js";
import type { CallRow, Stats } from "../core/ledger/types.js";
import type { Recipe } from "../core/recipes.js";
import { escapeHtml as h, page } from "./layout.js";

export interface LandingData {
  stats: Stats;
  recent: CallRow[];
  /** The newest answered row that kept its answer text: the receipt a judge sees first. */
  latest: CallRow | null;
  ledgerKind: "postgres" | "memory";
  payer: string | null;
  publicUrl: string | undefined;
  botUsername: string | undefined;
  paid: boolean;
  recipes: Recipe[];
  quick: Example[];
  groups: Array<{ title: string; intents: string[] }>;
  examples: Example[];
}

/**
 * Who chose the miner, and why Morse did when it did. `routedBy` alone reads as one
 * word, and three-quarters of the rows said "Morse" for calls the user had asked for
 * by name — which looked like the router failing every time (it was answering 37 of
 * 38). The podium and second-opinion arms are dead for new calls and kept because
 * older rows still carry those kinds; history is not rewritten.
 */
function routed(r: CallRow): string {
  if (r.routedBy === "engine") return "Telegraph";
  if (r.routedBy !== "morse") return "—";
  if (r.kind === "podium") return "Morse (podium)";
  if (r.kind === "second-opinion") return "Morse (2nd opinion)";
  if (r.kind === "direct") return "Morse (named miner)";
  return "Morse (fallback)";
}

function routedLong(r: CallRow): string {
  if (r.routedBy === "engine") return "Telegraph's own router";
  if (r.routedBy !== "morse") return "—";
  if (r.kind === "podium") return "Morse, asking the podium";
  if (r.kind === "second-opinion") return "Morse, for a second opinion";
  if (r.kind === "direct") return "Morse, at your request";
  return "Morse's fallback router";
}

function row(r: CallRow): string {
  const status = r.status === "ok" ? `<span class="ok">ok</span>` : `<span class="bad">${h(r.status)}</span>`;
  const verify = r.signalHash ? `<a href="/verify/${h(r.signalHash)}"><code>${h(r.signalHash.slice(0, 10))}…</code></a>` : `<span class="muted">—</span>`;
  const conf = r.confidence === null ? `<span class="muted">n/r</span>` : `${(r.confidence * 100).toFixed(0)}%`;
  return `<tr><td class="mono muted">${h(r.at.replace("T", " ").slice(0, 19))}Z</td><td>${h(r.channel)}</td><td>${h(r.kind)}</td><td>${h(r.intent ?? "—")}</td><td>${h(r.minerSlug ?? "—")}${r.minerRank ? ` <span class="badge">#${r.minerRank}</span>` : ""}</td><td>${routed(r)}</td><td>${conf}</td><td>${r.costUsd !== null ? `$${r.costUsd.toFixed(2)}` : "—"}</td><td>${r.durationMs ?? "—"}</td><td>${status}</td><td>${verify}</td></tr>`;
}

function latestReceipt(r: CallRow): string {
  return `
<section class="panel hero"><h2>What a receipt looks like <span class="badge">latest real answer</span></h2>
<p class="q">“${h(r.preview)}”</p>
<div class="card">${h(r.answer ?? "")}</div>
<dl class="rcpt">
<dt>Answered by</dt><dd><b>${h(r.minerSlug ?? "?")}</b>${r.minerRank ? ` · ranked <b>#${r.minerRank}</b>` : ""}${r.intent ? ` for <code>${h(r.intent)}</code>` : ""}</dd>
<dt>Routed by</dt><dd>${routedLong(r)}</dd>
<dt>Confidence</dt><dd>${r.confidence === null ? "not reported by this miner" : `${(r.confidence * 100).toFixed(0)}%`}</dd>
<dt>Cost</dt><dd>${r.costUsd !== null ? `$${r.costUsd.toFixed(2)}` : "—"} · ${r.durationMs ?? "?"} ms${r.settlementTx ? ` · <a href="https://sepolia.basescan.org/tx/${h(r.settlementTx)}">settled on Base Sepolia</a>` : ""}</dd>
<dt>Signal hash</dt><dd><a href="/verify/${h(r.signalHash ?? "")}"><code>${h(r.signalHash ?? "")}</code></a> — click to see the node's record and that Morse's wallet paid for it</dd>
</dl></section>`;
}

export function landingPage(d: LandingData): string {
  const s = d.stats;
  const quick = d.quick.map((e) => `<button type="button" class="ex" data-q="${h(e.q)}" title="${h(e.intent)}">${h(e.label)}</button>`).join("");
  const recipeChips = d.recipes.map((r) => `<button type="button" class="rc" data-fill="/${h(r.name)} " title="${h(r.description)}">${h(r.usage)}</button>`).join("");
  const groups = d.groups
    .map((g) => {
      const items = g.intents
        .flatMap((i) => d.examples.filter((e) => e.intent === i))
        .map((e) => `<li><a href="#" class="exq" data-q="${h(e.q)}">${h(e.q)}</a> <span class="muted">${h(e.intent)}</span></li>`)
        .join("");
      return `<div><h3>${h(g.title)}</h3><ul>${items}</ul></div>`;
    })
    .join("");
  const telegram = d.botUsername
    ? `<a class="tg" href="https://t.me/${h(d.botUsername)}">Open @${h(d.botUsername)} in Telegram →</a>`
    : `<span class="muted">The Telegram bot is not connected yet.</span>`;
  const body = `
<p class="lede"><b>Telegraph in Telegram.</b> Ask, get an answer from a ranked miner, with a receipt.</p>
<p class="sub-lede">No wallet, no key, no sign-up. Type a question, Telegraph's router sends it to the best-ranked miner for that intent, Morse pays the $0.01 fee, and the answer comes back naming who answered, what it cost, and a signal hash you can check on the node and on-chain.</p>
<div class="cta">${telegram}<span class="muted">or try it right here ↓</span></div>
${d.paid ? "" : `<div class="panel warn"><b>Morse is not funded yet.</b> The payer wallet or daily budget is not configured, so asking is disabled until the operator funds it. Everything else on this page is live.</div>`}
<section class="panel"><h2>Ask the network</h2>
<form class="ask" id="ask"><input id="q" name="q" placeholder="Try: Is the SSL certificate for github.com valid, and who issued it?" maxlength="2000" required autocomplete="off"><button id="go" type="submit">Ask</button></form>
<div class="chips"><span class="muted">Try one:</span>${quick}</div>
<div class="chips"><span class="muted">Recipes (several miners at once):</span>${recipeChips}</div>
<div id="out"></div></section>

${d.latest ? latestReceipt(d.latest) : ""}

<section class="grid">
<div class="stat"><b>${s.usersAnswered}</b><span>people answered<br><span class="muted">of ${s.users} who asked</span></span></div>
<div class="stat"><b>${s.okCalls}</b><span>answered calls</span></div>
<div class="stat"><b>${s.intents}</b><span>intents used</span></div>
<div class="stat"><b>${s.miners}</b><span>miners served</span></div>
<div class="stat"><b>$${s.spentUsd.toFixed(2)}</b><span>paid to the network</span></div>
<div class="stat"><b>${s.today.calls}</b><span>calls today · ${s.today.users} users</span></div>
</section>

<section class="panel"><details><summary><b>What can I ask?</b> <span class="muted">— one example per intent the network serves; click any to ask it</span></summary><div class="groups">${groups}</div></details></section>

<section class="panel"><h2>Questions people ask about Morse</h2>
<details><summary>What is this, in one sentence?</summary><p>Telegraph, inside Telegram: dozens of independent "miners" (APIs and models) compete on a public leaderboard to answer questions, and Morse lets you ask them from a chat, without a wallet.</p></details>
<details><summary>What can I ask?</summary><p>Anything the network has a miner for: certificate and link safety checks, weather and storm risk, crypto and stock prices, wallet balances and fraud risk, fact checks, translations, news and papers, plus general questions. The list above has one example per intent.</p></details>
<details><summary>Is it free? Who pays?</summary><p>Free for you. Each answer costs about $0.01 in testnet USDC, which Morse's own wallet pays via x402. Limits: 20 questions per day on the web, 40 in Telegram, 100 per API key.</p></details>
<details><summary>What is the receipt, and how do I verify it?</summary><p>Every answer names the miner, its leaderboard rank, who routed the question, the miner's confidence, the cost, the on-chain settlement, and a <b>signal hash</b>. Click "verify" on any answer or ledger row: Morse fetches the node's own record for that hash, shows the wallet that paid and checks it is Morse's, and links the USDC transfer on BaseScan.</p></details>
<details><summary>Is my question public?</summary><p>Yes. The ledger below lists every call, and <a href="/api/recent">/api/recent</a> returns the question clipped to 200 characters and the answer excerpt. Do not type anything private. Who asked is stored only as a salted hash.</p></details>
<details><summary>Can I use it from code or an AI agent?</summary><p>Yes: a hosted MCP server and a REST endpoint, no wallet needed. <a href="/keys">Get a free key</a>.</p></details>
</section>

<section class="panel" id="ledger"><h2>Public ledger <span class="badge">${d.ledgerKind === "postgres" ? "durable" : "ephemeral · dev"}</span></h2>
<p class="muted">The evidence behind the counters above: every call Morse has made, newest first, including the operator's own testing — nothing is separated out and nothing is manufactured. "Routed" says who chose the miner: Telegraph's router for a normal ask; Morse when you named the miner, or as a fallback when the router did not answer. Rows of kind <code>podium</code> and <code>second-opinion</code> are from two features removed on 4 September, after an organizer said that paying several miners per question to re-check the ranking is what the protocol already does once for everyone; they stay here because the ledger is not rewritten. Payer wallet: ${d.payer ? `<a href="https://sepolia.basescan.org/address/${h(d.payer)}"><code>${h(d.payer)}</code></a>` : "<i>not configured</i>"}. Cross-check any row at its verify link, or on the node with <code>GET /engine/v1/signal/{hash}</code>. JSON: <a href="/api/stats">/api/stats</a> · <a href="/api/recent">/api/recent</a> · <a href="/api/health">/api/health</a>. A check that does not rely on this table: <a href="/proof"><b>on-chain proof</b></a> matches every settlement hash here against the payer wallet's USDC transfers on Base Sepolia.</p>
<div class="tablewrap"><table><thead><tr><th>time (UTC)</th><th>channel</th><th>kind</th><th>intent</th><th>miner</th><th>routed</th><th>conf.</th><th>cost</th><th>ms</th><th>status</th><th>verify</th></tr></thead>
<tbody>${d.recent.length ? d.recent.map(row).join("") : `<tr><td colspan="11" class="muted">No calls yet.</td></tr>`}</tbody></table></div></section>

<section class="panel"><h2>How routing works</h2>
<p>Your question goes to Telegraph's own router (<code>POST /engine/v1/ask</code>), which classifies it into one of the network's 45 canonical intents with an LLM and picks a ranked miner — 70% of traffic goes to #1, 20% to #2, 10% to #3, re-ranked from validator scores every 9-hour epoch. If the router does not answer within 20 seconds (on 2 September it timed out at ~47 s for a day), Morse falls back to its own keyword classifier over the live leaderboard and calls the best-ranked miner directly. Every receipt says which of the two happened.</p>
<p><b>Not an aggregator, not a validator.</b> Morse does not pick providers, does not blend answers and does not check one miner against another. Telegraph's leaderboard already decides which miner is best, once, for everyone; the router's pick is the answer. Morse pays the fee, shows the answer, and keeps the receipt where anyone can check it: <a href="/proof">every payment reconciled against the chain</a>.</p>
<p><b>Disclosure:</b> one miner the network often routes to, <code>livecert</code>, is operated by the same person who built Morse. It holds its ranks on the public leaderboard; Morse neither skips it nor favours it, and every ledger row names the miner it went to.</p>
<p>In Telegram: ${d.botUsername ? `<b><a href="https://t.me/${h(d.botUsername)}">@${h(d.botUsername)}</a></b>` : "<b>not connected yet</b>"}. For agents: <a href="/keys">hosted MCP and REST, no wallet needed</a>. Source and honest limits: <a href="https://github.com/Harshyadav442277/telegraph-morse">GitHub</a>.</p></section>

<script>
const form=document.getElementById('ask'),q=document.getElementById('q'),out=document.getElementById('out'),go=document.getElementById('go');
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function conf(r){return r.confidence==null?'not reported':(r.confidenceIsRisk?'risk ':'')+Math.round(r.confidence*100)+'%'+(r.confidenceIsRisk?' (miner metric)':'')}
function routedBy(x,k){return x==='engine'?"Telegraph's own router":x==='morse'?(k==='direct'?"Morse, at your request":"Morse's fallback router"):'—'}
function receipt(r,routed,kind){if(!r)return'';return'<dl class="rcpt"><dt>Answered by</dt><dd><b>'+esc(r.minerSlug||'?')+'</b>'+(r.minerRank?' · ranked <b>#'+r.minerRank+'</b>':'')+(r.intent?' for <code>'+esc(r.intent)+'</code>':'')+'</dd>'+(routed?'<dt>Routed by</dt><dd>'+routedBy(routed,kind)+'</dd>':'')+'<dt>Confidence</dt><dd>'+conf(r)+'</dd><dt>Cost</dt><dd>'+(r.costUsd!=null?'$'+r.costUsd.toFixed(2):'—')+' · '+(r.durationMs||'?')+' ms'+(r.settlementTx?' · <a href="https://sepolia.basescan.org/tx/'+r.settlementTx+'">settled on Base Sepolia</a>':'')+'</dd>'+(r.signalHash?'<dt>Signal hash</dt><dd><a href="/verify/'+r.signalHash+'"><code>'+r.signalHash.slice(0,18)+'…</code> verify on the node</a></dd>':'')+'</dl>'}
function card(c){if(!c.ok||!c.receipt)return'<div class="card bad">'+esc(c.error||'no answer')+'</div>';return'<div class="card">'+esc(c.receipt.answer)+receipt(c.receipt,c.routedBy,c.kind)+'</div>'}
async function run(body){go.disabled=true;out.innerHTML='<div class="card muted">Asking the Telegraph network…</div>';try{const r=await fetch('/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(j.cards){out.innerHTML='<div class="card"><b>'+esc(j.recipe)+'</b> · '+esc(j.subject||'')+'<br>'+esc(j.verdict||j.error||'')+'</div>'+j.cards.map(card).join('')}else out.innerHTML=card(j.error&&!('ok' in j)?{ok:false,error:j.error}:j)}catch(e){out.innerHTML='<div class="card bad">'+esc(e.message)+'</div>'}go.disabled=false}
form.addEventListener('submit',e=>{e.preventDefault();run({question:q.value})});
document.querySelectorAll('.ex,.exq').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();q.value=b.dataset.q;q.scrollIntoView({block:'center'});run({question:q.value})}));
document.querySelectorAll('.rc').forEach(b=>b.addEventListener('click',()=>{q.value=b.dataset.fill;q.focus()}));
</script>`;
  return page("Morse · Telegraph in Telegram", body, {
    description: "Telegraph in Telegram. Ask, get an answer from a ranked miner, with a receipt.",
  });
}
