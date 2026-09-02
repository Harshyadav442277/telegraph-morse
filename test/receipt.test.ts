import { describe, expect, it } from "vitest";
import { buildReceipt, extractAnswer, getPath, toConfidence } from "../src/core/receipt.js";

describe("receipt extraction", () => {
  it("reads the miner's declared reason and confidence paths", () => {
    const r = buildReceipt(
      { miner_id: 4433, miner_name: "livecert", intent: "SSL_VERIFICATION", result: { verdict: "valid", confidence: 0.98, reason: "Chain trusted; expires in 60 days." }, cost_usd: 0.01, duration_ms: 412, signal_hash: "0xabc" },
      { confidence_field: "confidence", label_field: "verdict", reason_field: "reason" },
      1,
    );
    expect(r.answer).toBe("Chain trusted; expires in 60 days.");
    expect(r.confidence).toBe(0.98);
    expect(r.label).toBe("valid");
    expect(r.minerId).toBe("4433");
    expect(r.minerRank).toBe(1);
    expect(r.signalHash).toBe("0xabc");
  });

  it("falls back to chat-completion shapes and nested fields", () => {
    expect(extractAnswer({ choices: [{ message: { content: "Paris." } }] })).toBe("Paris.");
    expect(extractAnswer({ data: { answer: "42" } })).toBe("42");
    expect(extractAnswer("plain text")).toBe("plain text");
    expect(extractAnswer(null)).toMatch(/empty/);
  });

  it("truncates opaque JSON and never returns an empty string", () => {
    const big = { numbers: Array.from({ length: 500 }, (_, i) => i) };
    const a = extractAnswer(big);
    expect(a.length).toBeLessThanOrEqual(602);
    expect(a.length).toBeGreaterThan(0);
  });

  it("normalises confidence scales", () => {
    expect(toConfidence(0.5)).toBe(0.5);
    expect(toConfidence(87)).toBe(0.87);
    expect(toConfidence("0.25")).toBe(0.25);
    expect(toConfidence("high")).toBeNull();
    expect(toConfidence(150)).toBeNull();
    expect(toConfidence(undefined)).toBeNull();
  });

  it("walks dotted paths including array indexes", () => {
    expect(getPath({ a: { b: [{ c: 1 }] } }, "a.b.0.c")).toBe(1);
    expect(getPath({ a: 1 }, "a.b")).toBeUndefined();
    expect(getPath(null, "a")).toBeUndefined();
  });

  it("keeps warnings and router reasoning", () => {
    const r = buildReceipt({ result: {}, warnings: ["rate limit"], reasoning: "weather query" });
    expect(r.warnings).toEqual(["rate limit"]);
    expect(r.routerReasoning).toBe("weather query");
    expect(r.confidence).toBeNull();
  });
});
