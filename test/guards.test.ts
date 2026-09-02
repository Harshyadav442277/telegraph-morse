import { describe, expect, it } from "vitest";
import type { Config } from "../src/config.js";
import { guardPaid } from "../src/core/guards.js";
import { MemoryLedger } from "../src/core/ledger/memory.js";
import type { CallRow } from "../src/core/ledger/types.js";

const base: Config = {
  EVM_PRIVATE_KEY: `0x${"1".repeat(64)}`,
  HASH_SALT: "salt-for-tests",
  DAILY_BUDGET_CALLS: 5,
  PER_TELEGRAM_USER_DAILY: 2,
  PER_WEB_SESSION_DAILY: 1,
  PER_API_KEY_DAILY: 3,
  KILL_SWITCH: false,
  TELEGRAPH_NODE: "https://devnode.telegraphprotocol.com",
  SECOND_OPINION_THRESHOLD: 0.6,
  ASK_TIMEOUT_MS: 45_000,
};

function okRow(userHash: string): CallRow {
  return { id: Math.random().toString(36), at: new Date().toISOString(), channel: "telegram", userHash, kind: "ask", preview: "q", intent: "X", minerSlug: "m", minerId: "1", minerRank: 1, confidence: null, costUsd: 0.01, durationMs: 1, signalHash: "0x1", settlementTx: null, status: "ok", error: null };
}

describe("paid guards", () => {
  it("refuses everything when no wallet or budget is configured", async () => {
    const l = new MemoryLedger();
    const d = await guardPaid({ ...base, DAILY_BUDGET_CALLS: 0 }, l, "telegram", "u", 1);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/funded wallet|budget/);
    const k = await guardPaid({ ...base, KILL_SWITCH: true }, l, "telegram", "u", 1);
    expect(k.reason).toMatch(/paused/);
  });

  it("enforces the per-identity cap from the ledger", async () => {
    const l = new MemoryLedger();
    await l.recordCall(okRow("u1"));
    await l.recordCall(okRow("u1"));
    const d = await guardPaid(base, l, "telegram", "u1", 1);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/Daily limit/);
    const other = await guardPaid(base, l, "telegram", "u2", 1);
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(1);
  });

  it("enforces the global daily budget after the identity cap", async () => {
    const l = new MemoryLedger();
    for (let i = 0; i < 5; i++) await l.recordCall(okRow(`u${i}`));
    const d = await guardPaid(base, l, "telegram", "fresh", 1);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/budget/);
  });

  it("uses the key's own cap for mcp and rest identities", async () => {
    const l = new MemoryLedger();
    const d = await guardPaid(base, l, "mcp", "k", 4, 10);
    expect(d.allowed).toBe(true);
    const e = await guardPaid(base, l, "rest", "k", 4);
    expect(e.allowed).toBe(false);
  });

  it("does not count failed calls against a user", async () => {
    const l = new MemoryLedger();
    await l.recordCall({ ...okRow("u"), status: "error" });
    await l.recordCall({ ...okRow("u"), status: "timeout" });
    const d = await guardPaid(base, l, "telegram", "u", 1);
    expect(d.allowed).toBe(true);
  });
});
