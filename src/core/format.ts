import type { AnswerCard } from "./ask.js";
import type { Receipt } from "./receipt.js";
import type { RecipeResult } from "./recipes.js";

/** Telegram HTML needs only these three escaped. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function shortHash(h: string | null): string {
  return h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—";
}

export function confidenceText(c: number | null, isRisk = false): string {
  if (c === null) return "confidence not reported";
  const pct = (c * 100).toFixed(0);
  // The miner reported how bad, not how sure. Saying "confidence" here would invert it.
  return isRisk ? `risk ${pct}% (the miner's own metric, not confidence)` : `confidence ${pct}%`;
}

/** Who chose the miner. Morse chooses on purpose for a named miner; "fallback" is only the ask kind. */
export function routedByText(r: "engine" | "morse" | null | undefined, kind?: string): string {
  if (r === "engine") return "routed by Telegraph";
  if (r !== "morse") return "";
  if (kind === "direct") return "asked directly at your request";
  return "Morse fallback routing";
}

export function receiptLine(r: Receipt, publicUrl: string | undefined, routedBy?: "engine" | "morse" | null, kind?: string): string {
  const who = r.minerSlug ?? "an unnamed miner";
  const rank = r.minerRank ? ` (#${r.minerRank}` + (r.intent ? ` for ${r.intent})` : ")") : r.intent ? ` (${r.intent})` : "";
  const cost = r.costUsd !== null ? `$${r.costUsd.toFixed(2)}` : "cost n/a";
  const ms = r.durationMs !== null ? `${r.durationMs} ms` : "";
  const routed = routedBy ? ` · ${routedByText(routedBy, kind)}` : "";
  const verify = r.signalHash
    ? publicUrl
      ? `\n<a href="${publicUrl}/verify/${r.signalHash}">verify ${shortHash(r.signalHash)}</a>`
      : `\nsignal ${shortHash(r.signalHash)}`
    : "";
  const tx = r.settlementTx ? ` · <a href="https://sepolia.basescan.org/tx/${r.settlementTx}">paid on-chain</a>` : "";
  return `<i>served by <b>${esc(who)}</b>${esc(rank)} · ${confidenceText(r.confidence, r.confidenceIsRisk)} · ${cost}${ms ? ` · ${ms}` : ""}${routed}</i>${verify}${tx}`;
}

/** Telegram message body (HTML) for one answer card. */
export function cardHtml(card: AnswerCard, publicUrl: string | undefined): string {
  if (!card.ok || !card.receipt) {
    return `⚠️ ${esc(card.error ?? "The network did not answer.")}`;
  }
  const r = card.receipt;
  return `${esc(clip(r.answer, 1500))}\n\n${receiptLine(r, publicUrl, card.routedBy, card.kind)}`;
}

export function recipeHtml(res: RecipeResult, publicUrl: string | undefined): string {
  if (res.error) return `⚠️ ${esc(res.error)}`;
  const parts = [`<b>${esc(res.recipe)}</b> · ${esc(res.subject)}\n${esc(res.verdict)}`];
  for (const c of res.cards) {
    if (c.ok && c.receipt) {
      parts.push(`▸ <b>${esc(c.receipt.intent ?? "answer")}</b>\n${esc(clip(c.receipt.answer, 500))}\n${receiptLine(c.receipt, publicUrl, c.routedBy, c.kind)}`);
    } else {
      parts.push(`▸ <i>${esc(c.error ?? "one check failed")}</i>`);
    }
  }
  return parts.join("\n\n");
}

export function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
