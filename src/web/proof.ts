import type { Reconciliation } from "../core/proof.js";
import { DIAMOND } from "../core/proof.js";
import { escapeHtml as h, page } from "./layout.js";

function ts(s: string | null): string {
  return s ? s.replace("T", " ").slice(0, 19) + "Z" : "—";
}

export function proofPage(r: Reconciliation, stats: { okCalls: number; miners: number; usersAnswered: number }): string {
  const payerLink = r.payer
    ? `<a href="https://sepolia.basescan.org/address/${h(r.payer)}"><code>${h(r.payer)}</code></a> (<a href="https://base-sepolia.blockscout.com/address/${h(r.payer)}?tab=token_transfers">Blockscout</a>)`
    : "<i>not configured</i>";
  const allMatched = r.error === null && r.ledgerOnly.length === 0;
  const verdict = r.error
    ? `<div class="panel warn"><b>Chain read failed.</b> ${h(r.error)} The ledger numbers below are still real; the chain column is empty until the indexer answers.</div>`
    : `<div class="panel ${allMatched ? "hero" : "warn"}"><b>${r.matched} of ${r.ledger.withSettlement} ledger settlements are on chain</b>${allMatched ? " — every paid call Morse has recorded is a real USDC transfer to Telegraph." : ` — ${r.ledgerOnly.length} not yet visible to the indexer (listed below).`}${r.chainOnly.length ? ` The chain also shows <b>${r.chainOnly.length}</b> settlement${r.chainOnly.length === 1 ? "" : "s"} with no ledger row: payments that landed after Morse had already recorded the call as failed or timed out. They are counted here and not hidden.` : ""}</div>`;

  const chainOnlyRows = r.chainOnly
    .slice(0, 50)
    .map((t) => `<tr><td class="mono muted">${h(ts(t.at))}</td><td class="mono"><a href="https://sepolia.basescan.org/tx/${h(t.txHash)}">${h(t.txHash.slice(0, 14))}…</a></td><td>$${t.usdc.toFixed(2)}</td><td class="mono">${t.to === DIAMOND.toLowerCase() ? "Telegraph Diamond" : h(t.to)}</td></tr>`)
    .join("");
  const ledgerOnlyRows = r.ledgerOnly
    .slice(0, 50)
    .map((x) => `<tr><td class="mono muted">${h(ts(x.at))}</td><td class="mono"><a href="https://sepolia.basescan.org/tx/${h(x.txHash)}">${h(x.txHash.slice(0, 14))}…</a></td><td>${h(x.intent ?? "—")}</td><td>${h(x.minerSlug ?? "—")}</td></tr>`)
    .join("");

  const body = `
<h2>On-chain proof of usage</h2>
<p class="lede">Judges are asked to count "actual volume of Telegraph calls". Morse's ledger says one thing; this page checks it against something Morse does not control — the payer wallet's USDC transfers on Base Sepolia, read from a public indexer and matched to the ledger hash for hash.</p>
${verdict}
<section class="grid">
<div class="stat"><b>${r.chain.toDiamond}</b><span>USDC settlements on chain<br><span class="muted">payer → Telegraph Diamond</span></span></div>
<div class="stat"><b>${r.ledger.withSettlement}</b><span>ledger rows with a settlement hash<br><span class="muted">of ${r.ledger.okRows} answered calls</span></span></div>
<div class="stat"><b>${r.matched}</b><span>matched hash for hash</span></div>
<div class="stat"><b>$${r.chain.usdc.toFixed(2)}</b><span>USDC paid to the network on chain</span></div>
<div class="stat"><b>${stats.miners}</b><span>distinct miners paid<br><span class="muted">from the ledger; the chain sees only the Diamond</span></span></div>
<div class="stat"><b>${stats.usersAnswered}</b><span>people answered<br><span class="muted">ledger identities; not on chain</span></span></div>
</section>

<section class="panel"><h2>How to check this yourself</h2>
<p>Payer wallet: ${payerLink}. Every x402 payment is a transfer of testnet USDC from that wallet to Telegraph's Diamond <a href="https://sepolia.basescan.org/address/${DIAMOND}"><code>${DIAMOND}</code></a>, and the node returns the transaction hash in its <code>payment-response</code> header, which Morse stores on the ledger row as <code>settlementTx</code>. This page reads the wallet's outbound token transfers from Blockscout (<code>${h(r.source)}/addresses/{payer}/token-transfers?type=ERC-20</code>), and reports three numbers: how many settlements the chain shows, how many ledger rows carry a hash, and how many of those hashes are on the chain. JSON: <a href="/api/proof">/api/proof</a>. Chain read at ${h(ts(r.fetchedAt))}, first settlement ${h(ts(r.chain.first))}, latest ${h(ts(r.chain.last))}.</p>
<p class="muted">Limits, stated plainly: this proves payments, not people — users are counted only in the ledger, as salted identity hashes. It runs on Base Sepolia with testnet USDC, so the money is not real even though the answers are. Blockscout is a third-party indexer and can lag the chain by a few blocks, so a call made seconds ago may show as "not yet visible" until it catches up. And a settlement with no ledger row is not extra usage Morse is claiming: it is a call Morse gave up on that the network settled anyway, kept visible rather than tidied away.</p></section>

${r.chainOnly.length ? `<section class="panel"><h2>On chain, not in the ledger <span class="badge">${r.chainOnly.length}</span></h2><div class="tablewrap"><table><thead><tr><th>time (UTC)</th><th>transaction</th><th>amount</th><th>to</th></tr></thead><tbody>${chainOnlyRows}</tbody></table></div></section>` : ""}
${r.ledgerOnly.length ? `<section class="panel"><h2>In the ledger, not yet on chain <span class="badge">${r.ledgerOnly.length}</span></h2><div class="tablewrap"><table><thead><tr><th>time (UTC)</th><th>transaction</th><th>intent</th><th>miner</th></tr></thead><tbody>${ledgerOnlyRows}</tbody></table></div></section>` : ""}
<p class="muted">Back to the <a href="/#ledger">public ledger</a> · <a href="/consensus">consensus report</a>.</p>`;
  return page("Proof · Morse", body, { description: "Morse's paid Telegraph calls, reconciled against USDC settlements on Base Sepolia." });
}
