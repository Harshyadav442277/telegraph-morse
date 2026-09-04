import { agreement, comparisonKind, type Agreement } from "./agree.js";
import { callMinerDirect, guard, type AskContext } from "./ask.js";
import type { CallRow } from "./ledger/types.js";
import type { Receipt } from "./receipt.js";
import { canAddress } from "./route.js";
import { leaderboard } from "./telegraph.js";

/**
 * Ask the Podium.
 *
 * A normal answer comes from Telegraph's own router: one miner, chosen by rank and
 * chance. Podium is the optional verification layer on top: at the user's request,
 * Morse asks the other top-ranked miners for the same intent the same question,
 * directly, and lays the answers side by side with one honest agreement line.
 *
 * Three things keep it honest and demoable:
 *  - it never replaces routing: it only ever runs after an answer exists, on a click;
 *  - every extra call is a normal receipted, paid ledger row, grouped to the original;
 *  - agreement is stated only when the answers are machine-comparable (a verdict or
 *    a figure); free-text answers are shown side by side and labelled as not judged.
 */
export const PODIUM_SIZE = 3;
/** Per-miner budget. A web podium runs inside one request: 2 × 15s stays under Vercel's 60s. */
export const PODIUM_CALL_TIMEOUT_MS = 15_000;

export interface PodiumMember {
  minerSlug: string;
  minerId: string;
  minerRank: number | null;
  /** True for the miner that gave the original answer; its receipt comes from the ledger row. */
  isOriginal: boolean;
  receipt: Receipt | null;
  error: string | null;
  /** Answer text shown side by side (the original's is the ledger excerpt). */
  answer: string | null;
  label: string | null;
  signalHash: string | null;
  settlementTx: string | null;
  confidence: number | null;
  confidenceIsRisk: boolean;
}

export interface PodiumResult {
  question: string;
  intent: string | null;
  original: CallRow | null;
  members: PodiumMember[];
  agreement: Agreement | null;
  /** How many paid calls this round made. */
  paidCalls: number;
  /** Miners on the leaderboard that Morse could not address from a sentence. */
  skipped: string[];
  error: string | null;
}

function memberFromRow(row: CallRow): PodiumMember {
  return {
    minerSlug: row.minerSlug ?? "?",
    minerId: row.minerId ?? "?",
    minerRank: row.minerRank,
    isOriginal: true,
    receipt: null,
    error: null,
    answer: row.answer,
    label: row.label,
    signalHash: row.signalHash,
    settlementTx: row.settlementTx,
    confidence: row.confidence,
    confidenceIsRisk: false,
  };
}

function memberFromReceipt(slug: string, id: string, rank: number | null, r: Receipt | null, error: string | null): PodiumMember {
  return {
    minerSlug: slug,
    minerId: id,
    minerRank: rank,
    isOriginal: false,
    receipt: r,
    error,
    answer: r?.answer ?? null,
    label: r?.label ?? null,
    signalHash: r?.signalHash ?? null,
    settlementTx: r?.settlementTx ?? null,
    confidence: r?.confidence ?? null,
    confidenceIsRisk: r?.confidenceIsRisk ?? false,
  };
}

function bad(question: string, error: string, original: CallRow | null = null): PodiumResult {
  return { question, intent: original?.intent ?? null, original, members: [], agreement: null, paidCalls: 0, skipped: [], error };
}

/**
 * Run a podium round for an answer already in the ledger. Costs one paid call per
 * podium miner that is not the original, at most `size - 1`, all sequential so the
 * facilitator never sees two of our payments at once (it rejected that before).
 */
export async function askPodium(ctx: AskContext, row: CallRow | null, size = PODIUM_SIZE): Promise<PodiumResult> {
  if (!row) return bad("", "I have no earlier answer of yours to put to the podium — ask something first.");
  const question = row.preview;
  if (!row.intent) return bad(question, "That answer did not name an intent, so there is no leaderboard to draw a podium from.", row);
  if (row.status !== "ok") return bad(question, "That question was not answered, so there is nothing to compare against.", row);

  const board = await leaderboard(row.intent);
  const ranked = board.filter((e) => e.rank !== null && (e.miner.endpoints?.length ?? 0) > 0);
  const skipped: string[] = [];
  const podium = ranked.filter((e) => {
    const ok = canAddress(e.miner);
    if (!ok) skipped.push(`${e.miner.slug} (#${e.rank})`);
    return ok;
  }).slice(0, size);

  const isOriginal = (slug: string, id: string) => slug === row.minerSlug || id === row.minerId || slug === row.minerId;
  const others = podium.filter((e) => !isOriginal(e.miner.slug, e.miner.id));
  if (others.length === 0) {
    return bad(question, `No other addressable miner is ranked for ${row.intent} right now, so there is no podium to ask.`, row);
  }

  const g = await guard(ctx, others.length);
  if (!g.allowed) return bad(question, g.reason ?? "Not allowed.", row);

  const members: PodiumMember[] = [];
  let paidCalls = 0;
  for (const e of podium) {
    if (isOriginal(e.miner.slug, e.miner.id)) {
      members.push(memberFromRow(row));
      continue;
    }
    const out = await callMinerDirect(ctx, e.miner, e.rank, row.intent, question, { kind: "podium", groupId: row.id, timeoutMs: PODIUM_CALL_TIMEOUT_MS });
    if (out.receipt) paidCalls += 1;
    members.push(memberFromReceipt(e.miner.slug, e.miner.id, e.rank, out.receipt, out.error));
  }
  // The original miner may sit below the podium (the router picks by chance, not only
  // by rank); it is still the answer being checked, so it is always in the comparison.
  if (!members.some((m) => m.isOriginal)) members.unshift(memberFromRow(row));

  const answered = members.filter((m) => m.answer);
  const agree = agreement(row.intent, answered.map((m) => ({ minerSlug: m.minerSlug, minerRank: m.minerRank, label: m.label, answer: m.answer })));
  return { question, intent: row.intent, original: row, members, agreement: agree, paidCalls, skipped, error: null };
}
