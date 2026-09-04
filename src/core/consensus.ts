import { agreement, comparisonKind, type Agreement } from "./agree.js";
import type { CallRow } from "./ledger/types.js";

/**
 * The consensus report: what every Podium round so far says about whether the
 * network's top-ranked miners agree with each other.
 *
 * Telegraph ranks miners with validator scripts. Podium asks the top three the same
 * question at a user's request, so its rows are a second, independent reading of the
 * same leaderboard: do the miners the router trusts most give the same answer? This
 * report aggregates those rounds per intent, names every disagreement, and links each
 * answer's receipt. It spends nothing: it is computed from ledger rows that already
 * exist, and it grows only when people ask for podiums.
 */
export interface RoundMember {
  minerSlug: string | null;
  minerRank: number | null;
  isOriginal: boolean;
  value: string | null;
  answer: string | null;
  signalHash: string | null;
  status: string;
}

export interface Round {
  groupId: string;
  at: string;
  intent: string | null;
  question: string;
  members: RoundMember[];
  agreement: Agreement;
}

export interface IntentSummary {
  intent: string;
  kind: "verdict" | "number" | "none";
  rounds: number;
  agree: number;
  disagree: number;
  undetermined: number;
}

export interface ConsensusReport {
  rounds: Round[];
  byIntent: IntentSummary[];
  totals: { rounds: number; agree: number; disagree: number; undetermined: number; extraCalls: number; secondOpinions: number };
  generatedAt: string;
}

/** Build the report from ledger rows (any order). */
export function consensusReport(rows: CallRow[], now = new Date()): ConsensusReport {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = new Map<string, CallRow[]>();
  for (const r of rows) {
    if (r.kind === "podium" && r.groupId) {
      const g = groups.get(r.groupId) ?? [];
      g.push(r);
      groups.set(r.groupId, g);
    }
  }

  const rounds: Round[] = [];
  for (const [groupId, legs] of groups) {
    const original = byId.get(groupId) ?? null;
    const intent = original?.intent ?? legs[0]?.intent ?? null;
    const answered = [
      ...(original ? [{ row: original, isOriginal: true }] : []),
      ...legs.filter((l) => l.status === "ok").map((row) => ({ row, isOriginal: false })),
    ];
    const agree = agreement(
      intent,
      answered.map(({ row }) => ({ minerSlug: row.minerSlug, minerRank: row.minerRank, label: row.label, answer: row.answer })),
    );
    const members: RoundMember[] = [
      ...answered.map(({ row, isOriginal }, i) => ({
        minerSlug: row.minerSlug,
        minerRank: row.minerRank,
        isOriginal,
        value: agree.values[i]?.value ?? null,
        answer: row.answer,
        signalHash: row.signalHash,
        status: row.status,
      })),
      ...legs
        .filter((l) => l.status !== "ok")
        .map((row) => ({ minerSlug: row.minerSlug, minerRank: row.minerRank, isOriginal: false, value: null, answer: null, signalHash: null, status: row.status })),
    ];
    const at = legs.map((l) => l.at).sort()[0] ?? original?.at ?? "";
    rounds.push({ groupId, at, intent, question: original?.preview ?? legs[0]?.preview ?? "", members, agreement: agree });
  }
  rounds.sort((a, b) => (a.at < b.at ? 1 : -1));

  const per = new Map<string, IntentSummary>();
  for (const r of rounds) {
    const key = r.intent ?? "(no intent)";
    const s = per.get(key) ?? { intent: key, kind: comparisonKind(r.intent), rounds: 0, agree: 0, disagree: 0, undetermined: 0 };
    s.rounds += 1;
    s[r.agreement.verdict] += 1;
    per.set(key, s);
  }
  const byIntent = [...per.values()].sort((a, b) => b.rounds - a.rounds || a.intent.localeCompare(b.intent));

  return {
    rounds,
    byIntent,
    totals: {
      rounds: rounds.length,
      agree: rounds.filter((r) => r.agreement.verdict === "agree").length,
      disagree: rounds.filter((r) => r.agreement.verdict === "disagree").length,
      undetermined: rounds.filter((r) => r.agreement.verdict === "undetermined").length,
      extraCalls: rows.filter((r) => r.kind === "podium" && r.status === "ok").length,
      secondOpinions: rows.filter((r) => r.kind === "second-opinion" && r.status === "ok").length,
    },
    generatedAt: now.toISOString(),
  };
}
