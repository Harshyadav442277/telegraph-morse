import { describe, expect, it } from "vitest";
import type { AnswerCard } from "../src/core/ask.js";
import { cardHtml, esc, receiptLine, routedByText, shortHash } from "../src/core/format.js";

describe("routedByText", () => {
  it("calls Morse a fallback only for a plain ask", () => {
    expect(routedByText("engine")).toBe("routed by Telegraph");
    expect(routedByText("engine", "podium")).toBe("routed by Telegraph");
    expect(routedByText("morse", "ask")).toBe("Morse fallback routing");
    expect(routedByText("morse")).toBe("Morse fallback routing");
    expect(routedByText("morse", "podium")).toBe("podium leg, asked directly");
    expect(routedByText("morse", "second-opinion")).toBe("second opinion, asked directly");
    expect(routedByText("morse", "direct")).toBe("asked directly at your request");
    expect(routedByText(null)).toBe("");
  });
});
import { hashId, newApiKey, hashKey, secretsMatch, bearer } from "../src/core/ids.js";

const card: AnswerCard = {
  ok: true,
  kind: "ask",
  question: "q",
  receipt: { minerSlug: "livecert", minerId: "4433", intent: "SSL_VERIFICATION", minerRank: 2, confidence: 0.93, confidenceIsRisk: false, label: "valid", answer: "<b>bold</b> & valid", costUsd: 0.01, durationMs: 412, signalHash: "0x" + "ab".repeat(32), settlementTx: null, routerReasoning: null, warnings: [], raw: {} },
  second: null,
  error: null,
  remaining: 3,
  rowId: "r",
};

describe("telegram formatting", () => {
  it("escapes miner text and renders the receipt with a verify link", () => {
    const html = cardHtml(card, "https://morse.example");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt; &amp; valid");
    expect(html).toContain("served by <b>livecert</b> (#2 for SSL_VERIFICATION)");
    expect(html).toContain("confidence 93%");
    expect(html).toContain(`https://morse.example/verify/0x${"ab".repeat(32)}`);
  });

  it("renders errors plainly", () => {
    expect(cardHtml({ ...card, ok: false, receipt: null, error: "Daily limit reached" }, undefined)).toContain("Daily limit reached");
  });

  it("degrades without a public url", () => {
    expect(receiptLine(card.receipt!, undefined)).toContain("signal 0xabababab…");
    expect(shortHash(null)).toBe("—");
    expect(esc("<>&")).toBe("&lt;&gt;&amp;");
  });
});

describe("identities", () => {
  it("hashes are salted, stable and short", () => {
    expect(hashId("tg", "1", "a")).toBe(hashId("tg", "1", "a"));
    expect(hashId("tg", "1", "a")).not.toBe(hashId("tg", "1", "b"));
    expect(hashId("tg", "1", "a")).toHaveLength(32);
  });

  it("api keys are prefixed and only their hash is stored", () => {
    const { key, keyHash } = newApiKey();
    expect(key.startsWith("morse_")).toBe(true);
    expect(hashKey(key)).toBe(keyHash);
    expect(keyHash).not.toContain(key);
  });

  it("secrets compare in constant time and bearers parse", () => {
    expect(secretsMatch("abc", "abc")).toBe(true);
    expect(secretsMatch("abc", "abd")).toBe(false);
    expect(secretsMatch(undefined, "abc")).toBe(false);
    expect(bearer("Bearer  tok ")).toBe("tok");
    expect(bearer("Basic x")).toBeUndefined();
  });
});
