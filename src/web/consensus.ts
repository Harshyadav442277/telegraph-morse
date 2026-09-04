import type { ConsensusReport, Round } from "../core/consensus.js";
import { escapeHtml as h, page } from "./layout.js";

function mark(v: "agree" | "disagree" | "undetermined"): string {
  return v === "agree" ? `<span class="ok">✅ agree</span>` : v === "disagree" ? `<span class="warn">⚠️ disagree</span>` : `<span class="muted">➖ not judged</span>`;
}

function roundHtml(r: Round): string {
  const members = r.members
    .map((m) => {
      const rank = m.minerRank ? `#${m.minerRank}` : "unranked";
      const tag = m.isOriginal ? ` <span class="badge">routed answer</span>` : "";
      const value = m.value ? `<b>${h(m.value)}</b>` : m.status === "ok" ? `<span class="muted">no comparable value</span>` : `<span class="bad">${h(m.status)}</span>`;
      const verify = m.signalHash ? ` · <a href="/verify/${h(m.signalHash)}">verify</a>` : "";
      const ans = m.answer ? `<div class="ans muted">${h(m.answer.length > 240 ? `${m.answer.slice(0, 237)}…` : m.answer)}</div>` : "";
      return `<div class="member"><div>${h(rank)} <b>${h(m.minerSlug ?? "?")}</b>${tag} → ${value}${verify}</div>${ans}</div>`;
    })
    .join("");
  return `<div class="podium"><div class="verdict">${mark(r.agreement.verdict)} · <code>${h(r.intent ?? "?")}</code> · <span class="muted">${h(r.at.replace("T", " ").slice(0, 16))}Z</span></div><p class="q">“${h(r.question)}”</p><p>${h(r.agreement.summary)}</p>${members}</div>`;
}

export function consensusPage(c: ConsensusReport): string {
  const t = c.totals;
  const byIntent = c.byIntent
    .map(
      (s) =>
        `<tr><td><code>${h(s.intent)}</code></td><td>${s.kind === "verdict" ? "verdicts" : s.kind === "number" ? "figures" : "free text"}</td><td>${s.rounds}</td><td class="ok">${s.agree}</td><td class="warn">${s.disagree}</td><td class="muted">${s.undetermined}</td></tr>`,
    )
    .join("");
  const judged = t.agree + t.disagree;
  const body = `
<h2>Consensus report</h2>
<p class="lede">Telegraph ranks miners with validator scripts. <b>Ask the podium</b> gives a second, independent reading of the same leaderboard: at a user's request, the top-ranked miners for an intent answer the same question, and Morse says whether they agree. This page is every round so far, per intent, with every disagreement named and every answer's receipt linked. It spends nothing — it is computed from ledger rows that already exist.</p>
<section class="grid">
<div class="stat"><b>${t.rounds}</b><span>podium rounds</span></div>
<div class="stat"><b>${judged ? `${Math.round((t.agree / judged) * 100)}%` : "—"}</b><span>agreement where judged<br><span class="muted">${t.agree} agree · ${t.disagree} disagree</span></span></div>
<div class="stat"><b>${t.undetermined}</b><span>not judged automatically<br><span class="muted">free text, or too few comparable answers</span></span></div>
<div class="stat"><b>${t.extraCalls}</b><span>extra paid answers<br><span class="muted">each a receipted ledger row</span></span></div>
<div class="stat"><b>${t.secondOpinions}</b><span>second opinions<br><span class="muted">next-ranked miner, one at a time</span></span></div>
</section>

<section class="panel"><h2>By intent</h2>
${c.byIntent.length ? `<div class="tablewrap"><table><thead><tr><th>intent</th><th>compared as</th><th>rounds</th><th>agree</th><th>disagree</th><th>not judged</th></tr></thead><tbody>${byIntent}</tbody></table></div>` : `<p class="muted">No podium rounds yet. Ask a question on the <a href="/">home page</a>, then click <b>Ask the podium</b>.</p>`}
<p class="muted">How agreement is judged: verdict intents (certificate validity, URL safety, fraud risk, fact checks, AI-text detection) by verdict words with negations tested first; figure intents (prices, FX, gas, balances, holder counts, TVL, temperature) by number within a stated tolerance; everything else is shown side by side and marked not judged. A round is judged only when at least two answers were comparable. The method is <a href="https://github.com/Harshyadav442277/telegraph-morse/blob/main/src/core/agree.ts">open source</a>; its limits are in GAPS G25. JSON: <a href="/api/consensus">/api/consensus</a>.</p></section>

<section class="panel"><h2>Every round, newest first</h2>
${c.rounds.length ? c.rounds.map(roundHtml).join("") : `<p class="muted">Nothing yet.</p>`}
</section>
<p class="muted">Back to the <a href="/#ledger">public ledger</a> · <a href="/proof">on-chain proof</a>.</p>`;
  return page("Consensus · Morse", body, { description: "Do Telegraph's top-ranked miners agree with each other? Every Podium round, per intent, with receipts." });
}
