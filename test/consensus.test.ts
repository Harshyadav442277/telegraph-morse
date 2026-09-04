import { describe, expect, it } from "vitest";
import { consensusReport } from "../src/core/consensus.js";
import type { CallRow } from "../src/core/ledger/types.js";

function row(over: Partial<CallRow> = {}): CallRow {
  return {
    id: Math.random().toString(36), at: "2026-09-03T10:00:00.000Z", channel: "web", userHash: "u", kind: "ask",
    preview: "Is the certificate for github.com valid?", intent: "SSL_VERIFICATION", minerSlug: "txlens", minerId: "9002",
    minerRank: 1, confidence: null, costUsd: 0.01, durationMs: 100, signalHash: `0x${"a".repeat(64)}`, settlementTx: null,
    routedBy: "engine", label: "valid", answer: "The certificate is valid.", groupId: null, status: "ok", error: null, ...over,
  };
}

describe("consensusReport", () => {
  it("groups podium legs to their original answer and judges verdict agreement", () => {
    const original = row({ id: "g1" });
    const rows = [
      original,
      row({ kind: "podium", groupId: "g1", minerSlug: "livecert", minerRank: 2, label: "valid", answer: "valid", at: "2026-09-03T10:01:00.000Z", signalHash: `0x${"b".repeat(64)}` }),
      row({ kind: "podium", groupId: "g1", minerSlug: "preflight", minerRank: 3, label: null, answer: "The chain is invalid: expired.", at: "2026-09-03T10:01:05.000Z", signalHash: `0x${"c".repeat(64)}` }),
    ];
    const c = consensusReport(rows);
    expect(c.totals.rounds).toBe(1);
    expect(c.totals.disagree).toBe(1);
    expect(c.totals.extraCalls).toBe(2);
    const r = c.rounds[0]!;
    expect(r.intent).toBe("SSL_VERIFICATION");
    expect(r.question).toBe("Is the certificate for github.com valid?");
    expect(r.members.map((m) => [m.minerSlug, m.isOriginal, m.value])).toEqual([
      ["txlens", true, "valid"],
      ["livecert", false, "valid"],
      ["preflight", false, "not valid"],
    ]);
    expect(r.agreement.summary).toMatch(/Disagreement/);
    expect(c.byIntent).toEqual([{ intent: "SSL_VERIFICATION", kind: "verdict", rounds: 1, agree: 0, disagree: 1, undetermined: 0 }]);
  });

  it("judges figures within tolerance, keeps failed legs visible, and counts second opinions", () => {
    const rows = [
      row({ id: "g2", intent: "CRYPTO_PRICE", preview: "BTC price?", minerSlug: "onchain-intel", label: null, answer: "BTC is 81019.01 USD", at: "2026-09-03T11:00:00.000Z" }),
      row({ kind: "podium", groupId: "g2", intent: "CRYPTO_PRICE", minerSlug: "sentinel", minerRank: 3, label: null, answer: "Bitcoin is trading at $81,150 right now.", at: "2026-09-03T11:00:10.000Z" }),
      row({ kind: "podium", groupId: "g2", intent: "CRYPTO_PRICE", minerSlug: "kriterion", minerRank: 4, status: "timeout", answer: null, label: null, signalHash: null, at: "2026-09-03T11:00:20.000Z" }),
      row({ kind: "second-opinion", intent: "WEATHER_CHECK", preview: "weather?", answer: "22°C" }),
      row({ kind: "second-opinion", intent: "WEATHER_CHECK", status: "error", answer: null }),
    ];
    const c = consensusReport(rows);
    expect(c.totals).toMatchObject({ rounds: 1, agree: 1, disagree: 0, undetermined: 0, extraCalls: 1, secondOpinions: 1 });
    const r = c.rounds[0]!;
    expect(r.agreement.summary).toMatch(/agree within 2%/);
    expect(r.members.find((m) => m.minerSlug === "kriterion")).toMatchObject({ status: "timeout", value: null, isOriginal: false });
  });

  it("orders rounds newest first and reports free-text intents as not judged", () => {
    const rows = [
      row({ id: "old", intent: "CHAT_COMPLETION", preview: "old", label: null, answer: "Leonardo.", at: "2026-09-01T00:00:00.000Z" }),
      row({ kind: "podium", groupId: "old", intent: "CHAT_COMPLETION", minerSlug: "groq", answer: "Leonardo da Vinci", label: null, at: "2026-09-01T00:00:10.000Z" }),
      row({ id: "new", intent: "CHAT_COMPLETION", preview: "new", label: null, answer: "Paris.", at: "2026-09-02T00:00:00.000Z" }),
      row({ kind: "podium", groupId: "new", intent: "CHAT_COMPLETION", minerSlug: "groq", answer: "Paris", label: null, at: "2026-09-02T00:00:10.000Z" }),
    ];
    const c = consensusReport(rows);
    expect(c.rounds.map((r) => r.question)).toEqual(["new", "old"]);
    expect(c.totals.undetermined).toBe(2);
    expect(c.byIntent[0]).toMatchObject({ intent: "CHAT_COMPLETION", kind: "none", rounds: 2, undetermined: 2 });
  });

  it("is empty, not broken, when no podium has ever run", () => {
    const c = consensusReport([row(), row({ kind: "second-opinion" })]);
    expect(c.rounds).toEqual([]);
    expect(c.byIntent).toEqual([]);
    expect(c.totals.secondOpinions).toBe(1);
  });
});
