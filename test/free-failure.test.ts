import { describe, expect, it } from "vitest";
import { humanError, isFreeFailure } from "../src/core/ask.js";
import { TelegraphError } from "../src/core/telegraph.js";

/**
 * Which failures another miner may be tried after. The rule is *known outcome*, not
 * *bad outcome*: the node settles only on a 2xx, so anything it refused or failed
 * cost nothing, while a timeout hid the outcome from us and may still settle.
 *
 * Getting this wrong cost real answers. Until 2026-09-04 a 5xx ended the attempt, so
 * every FACT_CHECK question died on one miner returning PROOF_PIPELINE_ERROR while
 * three other miners served the same intent (GAPS G33).
 */
describe("when another miner may be tried", () => {
  it("moves on from failures the node charges nothing for", () => {
    expect(isFreeFailure(new TelegraphError("payment refused", "unpaid", 402))).toBe(true);
    expect(isFreeFailure(new TelegraphError("predicted to fail", "engine", 422))).toBe(true);
    expect(isFreeFailure(new TelegraphError("upstream call failed", "engine", 500))).toBe(true);
    expect(isFreeFailure(new TelegraphError("bad gateway", "engine", 502))).toBe(true);
    expect(isFreeFailure(new TelegraphError("unavailable", "engine", 503))).toBe(true);
  });

  it("never moves on from an outcome it did not see", () => {
    // A timeout may land and settle after Morse gave up — those are the chain-only
    // settlements on /proof. Retrying one risks paying twice for one question.
    expect(isFreeFailure(new TelegraphError("timed out", "timeout", null))).toBe(false);
    expect(isFreeFailure(new TelegraphError("timed out late", "timeout", 504))).toBe(false);
  });

  it("does not guess about failures it cannot classify", () => {
    expect(isFreeFailure(new TelegraphError("no miner serves this", "engine", null))).toBe(false);
    expect(isFreeFailure(new TelegraphError("bad request", "engine", 400))).toBe(false);
    expect(isFreeFailure(new TelegraphError("socket hang up", "network", null))).toBe(false);
  });
});

describe("what a person is told when everything failed", () => {
  const miner = { slug: "qarinah-proofpack" } as never;
  const chosen = { intent: "FACT_CHECK", miner, rank: 1, why: "" } as never;

  it("never shows the node's raw JSON, and says whether money moved", () => {
    const raw = new TelegraphError(`Engine returned 500: {"error":"upstream call failed: PROOF_PIPELINE_ERROR"}`, "engine", 500);
    const msg = humanError(raw, chosen);
    expect(msg).not.toContain("{");
    expect(msg).toContain("qarinah-proofpack");
    expect(msg).toContain("not charged");
  });

  it("is honest that a timeout may still settle", () => {
    const msg = humanError(new TelegraphError("timed out", "timeout", null), chosen);
    expect(msg).toContain("/proof");
    expect(msg).not.toContain("not charged");
  });

  it("passes through a message that is already a sentence", () => {
    const e = new TelegraphError("No active miner serves a question like this right now.", "engine", null);
    expect(humanError(e, null)).toBe("No active miner serves a question like this right now.");
  });
});
