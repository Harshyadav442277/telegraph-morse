import type { CallRow } from "../core/ledger/types.js";
import type { SignalRecord } from "../core/telegraph.js";
import { escapeHtml as h, page } from "./layout.js";

export interface VerifyData {
  hash: string;
  record: SignalRecord | null;
  paidByMorse: boolean;
  payer: string | null;
  row: CallRow | null;
  error: string | null;
}

export function verifyPage(d: VerifyData): string {
  const s = d.record?.signal ?? {};
  const body = d.record
    ? `
<h2>Signal <code>${h(d.hash)}</code></h2>
<section class="panel">
<table><tbody>
<tr><th>Found on the node</th><td class="ok">yes — <a href="https://devnode.telegraphprotocol.com/engine/v1/signal/${h(d.hash)}">GET /engine/v1/signal/${h(d.hash.slice(0, 12))}…</a></td></tr>
<tr><th>Kind</th><td>${h(d.record.kind ?? "?")}</td></tr>
<tr><th>Miner</th><td>${h(s.miner_slug ?? "?")}${s.subnet_id ? ` <span class="badge">id ${h(s.subnet_id)}</span>` : ""}</td></tr>
<tr><th>Paid by</th><td class="mono">${s.wallet_address ? `<a href="https://sepolia.basescan.org/address/${h(s.wallet_address)}">${h(s.wallet_address)}</a>` : "?"} ${d.paidByMorse ? `<span class="ok">= Morse's payer wallet</span>` : d.payer ? `<span class="warn">not Morse's wallet (${h(d.payer.slice(0, 10))}…)</span>` : ""}</td></tr>
<tr><th>Node's own check</th><td>${d.record.verification?.verified === true ? `<span class="ok">verified</span> — the node confirms this hash commits to the payload below (${h(d.record.verification.algorithm ?? "?")} over ${h(d.record.verification.commitment ?? "?")})` : `<span class="muted">${h(JSON.stringify(d.record.verification ?? "not reported"))}</span>`}</td></tr>
<tr><th>Settlement tx</th><td class="mono">${
      s.tx_hash || d.row?.settlementTx
        ? `<a href="https://sepolia.basescan.org/tx/${h((s.tx_hash ?? d.row?.settlementTx)!)}">${h((s.tx_hash ?? d.row?.settlementTx)!)}</a>`
        : "<span class='muted'>the node's signal record carries none; Morse stores the one from the payment-response header when it has it</span>"
    }</td></tr>
<tr><th>Recorded</th><td>${h(s.created_at ?? "?")}</td></tr>
${d.row ? `<tr><th>Morse's ledger row</th><td>${h(d.row.at)} · ${h(d.row.channel)} · ${h(d.row.kind)} · ${h(d.row.intent ?? "—")} · ${h(d.row.minerSlug ?? "—")} · ${d.row.costUsd !== null ? `$${d.row.costUsd.toFixed(2)}` : ""}</td></tr>` : ""}
</tbody></table>
<p class="muted">The node states the hash is keccak256 over the payload and reports it verified. Morse shows that attestation as the node returns it: eleven serialisations of the payload as served were tried and none reproduced the hash, so Morse does <b>not</b> claim to have re-derived it independently (GAPS G3). What Morse does establish on its own is the payer — the wallet above is checked against Morse's.</p>
</section>
<section class="panel"><h2>Payload the hash covers</h2><pre>${h(JSON.stringify(d.record.payload ?? d.record.result ?? {}, null, 2).slice(0, 12_000))}</pre></section>`
    : `
<h2>Signal <code>${h(d.hash)}</code></h2>
<section class="panel"><p class="bad">Not found on the node: ${h(d.error ?? "unknown error")}</p>
${d.row ? `<p class="muted">Morse's ledger has a row for this hash (${h(d.row.at)}, ${h(d.row.status)}). If the node just recorded it, retry in a few seconds.</p>` : ""}
</section>`;
  return page(`Verify ${d.hash.slice(0, 12)}… · Morse`, body, { description: "Verify a Telegraph signal hash." });
}
