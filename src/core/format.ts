import type { AnswerCard } from "./ask.js";
import type { CallRow } from "./ledger/types.js";
import type { PodiumResult } from "./podium.js";
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

/** Who chose the miner. Morse chooses on purpose for a podium, a second opinion or a named miner; "fallback" is only the ask kind. */
export function routedByText(r: "engine" | "morse" | null | undefined, kind?: string): string {
  if (r === "engine") return "routed by Telegraph";
  if (r !== "morse") return "";
  if (kind === "direct") return "asked directly at your request";
  if (kind === "podium") return "podium leg, asked directly";
  if (kind === "second-opinion") return "second opinion, asked directly";
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
  const answer = clip(r.answer, 1500);
  let out = `${esc(answer)}\n\n${receiptLine(r, publicUrl, card.routedBy, card.kind)}`;
  if (card.second) {
    out += `\n\n<b>Second opinion</b>\n${esc(clip(card.second.answer, 700))}\n\n${receiptLine(card.second, publicUrl)}`;
  }
  return out;
}

/**
 * A second opinion is only meaningful next to the first one, so both miners and both
 * ranks are named. The ledger keeps the first answer's receipt, not its text, so the
 * first miner is shown as a receipt line and the second in full.
 */
export function secondOpinionHtml(
  first: CallRow,
  second: Receipt | null,
  error: string | null,
  publicUrl: string | undefined,
): string {
  const rank = (n: number | null) => (n ? ` #${n}` : "");
  const head =
    `<b>Second opinion</b> · <i>${esc(clip(first.preview, 160))}</i>\n\n` +
    `<b>1.</b> ${esc(first.minerSlug ?? "?")}${rank(first.minerRank)}` +
    `${first.intent ? ` for ${esc(first.intent)}` : ""} · ${confidenceText(first.confidence)}` +
    (first.signalHash && publicUrl ? ` · <a href="${publicUrl}/verify/${first.signalHash}">receipt</a>` : "");
  if (!second) return `${head}\n\n⚠️ ${esc(error ?? "No other miner could answer.")}`;
  return `${head}\n\n<b>2.</b> ${esc(second.minerSlug ?? "?")}${rank(second.minerRank)}\n${esc(clip(second.answer, 1200))}\n${receiptLine(second, publicUrl)}`;
}

/** Telegram rendering of a podium round: the verdict line first, then every miner. */
export function podiumHtml(res: PodiumResult, publicUrl: string | undefined): string {
  if (res.error) return `⚠️ ${esc(res.error)}`;
  const a = res.agreement;
  const mark = a?.verdict === "agree" ? "✅" : a?.verdict === "disagree" ? "⚠️" : "➖";
  const parts = [
    `<b>Podium</b> · ${esc(res.intent ?? "?")} · <i>${esc(clip(res.question, 140))}</i>`,
    `${mark} <b>${esc(a?.summary ?? "No comparison possible.")}</b>`,
  ];
  for (const m of res.members) {
    const rank = m.minerRank ? `#${m.minerRank}` : "unranked";
    const tag = m.isOriginal ? " · your answer" : "";
    const head = `<b>${esc(rank)} ${esc(m.minerSlug)}</b>${tag} · ${confidenceText(m.confidence, m.confidenceIsRisk)}`;
    if (m.answer) {
      const verify = m.signalHash && publicUrl ? `\n<a href="${publicUrl}/verify/${m.signalHash}">verify ${shortHash(m.signalHash)}</a>` : "";
      const tx = m.settlementTx ? ` · <a href="https://sepolia.basescan.org/tx/${m.settlementTx}">paid on-chain</a>` : "";
      parts.push(`${head}\n${esc(clip(m.answer, 600))}${verify}${tx}`);
    } else {
      parts.push(`${head}\n<i>${esc(m.error ?? "no answer")}</i>`);
    }
  }
  if (res.skipped.length) parts.push(`<i>Not asked (cannot be addressed from a sentence): ${esc(res.skipped.join(", "))}</i>`);
  parts.push(`<i>${res.paidCalls} extra paid call${res.paidCalls === 1 ? "" : "s"}, each with its own receipt.</i>`);
  return parts.join("\n\n");
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
