import { describe, expect, it } from "vitest";
import { buildReceipt, extractAnswer, getPath, minerRefusal, toConfidence } from "../src/core/receipt.js";

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

  // Real payloads from the node, Sep 7 – Oct 27 2026: each was shown as a one-word answer.
  it("never shows a declared source or status word when a sentence exists", () => {
    const chainsight = { label_field: "signal", reason_field: "source" };
    expect(extractAnswer({ answer: "valid", reason: "The TLS certificate for github.com is valid and trusted.", source: "tls", verdict: "valid" }, chainsight))
      .toBe("The TLS certificate for github.com is valid and trusted.");
    expect(extractAnswer({ price_usd: null, signal: "No live market price is currently available for Base sepolia.", source: "coingecko" }, chainsight))
      .toMatch(/^No live market price/);
    expect(extractAnswer({ data: { title: "RcodePlay - Overview", description: "RcodePlay has 10 repositories available." }, status: "success" }, { label_field: "title", reason_field: "description" }))
      .toBe("RcodePlay has 10 repositories available.");
    expect(extractAnswer({ answer: 0.55, report_id: "x", status: "success" }, { reason_field: "status" })).not.toBe("success");
    expect(extractAnswer({ articles: [], status: "ok", totalResults: 0 }, { label_field: "articles" })).not.toBe("ok");
  });

  it("keeps a one-word answer that is the answer", () => {
    expect(extractAnswer({ translation: "Hola" })).toBe("Hola");
  });

  it("reports a miner's refusal instead of its verdict, without confidence", () => {
    const r = buildReceipt(
      { miner_name: "telegraph-verity-intelligence", result: { answer: { authorized: false, hostname: "", port: 443 }, confidence: 1, evidence: [], uncertainty: [{ code: "invalid_hostname", message: "A hostname is required." }], verdict: "rejected" } },
      { confidence_field: "confidence", label_field: "verdict" },
    );
    expect(r.refusal).toBe("A hostname is required.");
    expect(r.answer).toBe("The miner could not answer: A hostname is required.");
    expect(r.confidence).toBeNull();
    expect(minerRefusal({ error: { message: "upstream down" } })).toBe("upstream down");
    expect(minerRefusal({ error: "invalid_cve_id", reason: "The value CVE-2025 is not a complete CVE identifier.", verdict: "unknown" }))
      .toBe("The value CVE-2025 is not a complete CVE identifier.");
    // A verdict alone is a judgement about the subject, not a refusal.
    expect(minerRefusal({ verdict: "rejected", reason: "Transaction matches a drainer pattern." })).toBeNull();
    expect(minerRefusal({ verdict: "valid", uncertainty: [{ message: "OCSP not checked." }] })).toBeNull();
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
