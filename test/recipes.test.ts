import { beforeEach, describe, expect, it } from "vitest";
import type { AnswerCard, AskContext } from "../src/core/ask.js";
import { setLedgerForTests } from "../src/core/ledger/index.js";
import { MemoryLedger } from "../src/core/ledger/memory.js";
import { fact, runRecipe, safe, wallet, weather, type Asker } from "../src/core/recipes.js";
import { resetConfigForTests } from "../src/config.js";

const ctx: AskContext = { channel: "web", userHash: "u" };

function fakeAsker(intentFor: (q: string) => string, answer = "fine", label: string | null = null): Asker {
  return async (_ctx, question, kind) => ({
    ok: true,
    kind,
    question,
    receipt: { minerSlug: "m", minerId: "1", intent: intentFor(question), minerRank: 1, confidence: 0.9, confidenceIsRisk: false, label, answer, costUsd: 0.01, durationMs: 10, signalHash: "0x" + "a".repeat(64), settlementTx: null, routerReasoning: null, warnings: [], raw: {} },
    error: null,
    remaining: 9,
    rowId: "r",
  });
}

beforeEach(() => {
  resetConfigForTests();
  process.env.EVM_PRIVATE_KEY = `0x${"2".repeat(64)}`;
  process.env.DAILY_BUDGET_CALLS = "100";
  setLedgerForTests(new MemoryLedger());
});

describe("recipes", () => {
  it("safe: rejects junk and plans 2-3 questions for a real host", async () => {
    expect(await safe.plan("not a url")).toHaveProperty("error");
    const plan = await safe.plan("https://example.com/path");
    expect("questions" in plan && plan.questions.length >= 2).toBe(true);
    if ("questions" in plan) {
      expect(plan.questions[0]).toMatch(/safe to visit/);
      expect(plan.questions[1]).toMatch(/example\.com/);
    }
  });

  it("safe: raises caution when any receipt carries a red flag", async () => {
    const flagged: AnswerCard[] = [
      { ok: true, kind: "safe", question: "a", receipt: { minerSlug: "m", minerId: "1", intent: "URL_SCAN", minerRank: 1, confidence: 0.9, confidenceIsRisk: false, label: "malicious", answer: "Phishing detected.", costUsd: 0.01, durationMs: 1, signalHash: null, settlementTx: null, routerReasoning: null, warnings: [], raw: {} }, error: null, remaining: 1, rowId: null },
    ];
    expect(safe.verdict(flagged)).toMatch(/Caution/);
    expect(safe.verdict([])).toMatch(/No miner/);
  });

  it("wallet: accepts addresses and ENS names only", async () => {
    expect(await wallet.plan("hello")).toHaveProperty("error");
    expect(await wallet.plan("vitalik.eth")).toHaveProperty("questions");
    expect(await wallet.plan(`0x${"a".repeat(40)}`)).toHaveProperty("questions");
  });

  it("weather and fact plan two questions each", async () => {
    const w = await weather.plan("Chennai");
    const f = await fact.plan("The Eiffel Tower is in Berlin");
    expect("questions" in w && w.questions.length).toBe(2);
    expect("questions" in f && f.questions.length).toBe(2);
  });

  it("runRecipe fans out through the asker and combines a verdict", async () => {
    const res = await runRecipe(ctx, weather, "Chennai", fakeAsker((q) => (/storm/i.test(q) ? "STORM_ALERT" : "WEATHER_CHECK")));
    expect(res.error).toBeNull();
    expect(res.cards).toHaveLength(2);
    expect(res.verdict).toMatch(/48-hour storm outlook/);
  });

  it("runRecipe refuses when the guard says no, without calling the network", async () => {
    process.env.DAILY_BUDGET_CALLS = "0";
    resetConfigForTests();
    let calls = 0;
    const asker: Asker = async () => {
      calls++;
      throw new Error("should not be called");
    };
    const res = await runRecipe(ctx, weather, "Chennai", asker);
    expect(res.error).toMatch(/funded wallet|budget/);
    expect(calls).toBe(0);
  });
});
