import { describe, expect, it } from "vitest";
import { secondOpinionHtml } from "../src/core/format.js";
import { MemoryLedger } from "../src/core/ledger/memory.js";
import type { CallRow } from "../src/core/ledger/types.js";
import type { Receipt } from "../src/core/receipt.js";

function row(over: Partial<CallRow> = {}): CallRow {
  return {
    id: Math.random().toString(36),
    at: new Date().toISOString(),
    channel: "telegram",
    userHash: "u1",
    kind: "ask",
    preview: "Is the certificate for github.com valid?",
    intent: "SSL_VERIFICATION",
    minerSlug: "livecert",
    minerId: "4433",
    minerRank: 1,
    confidence: 0.42,
    costUsd: 0.01,
    durationMs: 300,
    signalHash: `0x${"ab".repeat(32)}`,
    status: "ok",
    error: null,
    ...over,
  };
}

const second: Receipt = {
  minerSlug: "certinel",
  minerId: "9001",
  intent: "SSL_VERIFICATION",
  minerRank: 2,
  confidence: 0.88, confidenceIsRisk: false,
  label: "valid",
  answer: "The certificate is valid until 2027-02-14, issued by Sectigo.",
  costUsd: 0.01,
  durationMs: 511,
  signalHash: `0x${"cd".repeat(32)}`,
  routerReasoning: null,
  warnings: [],
  raw: {},
};

describe("second opinion presentation", () => {
  it("names both miners and both ranks", () => {
    const html = secondOpinionHtml(row(), second, null, "https://morse.example");
    expect(html).toContain("<b>1.</b> livecert #1 for SSL_VERIFICATION");
    expect(html).toContain("confidence 42%");
    expect(html).toContain("<b>2.</b> certinel #2");
    expect(html).toContain("The certificate is valid until 2027-02-14");
    expect(html).toContain(`https://morse.example/verify/0x${"cd".repeat(32)}`);
  });

  it("reports honestly when the next miner cannot be addressed directly", () => {
    const html = secondOpinionHtml(row(), null, "certinel could not answer directly: 422", undefined);
    expect(html).toContain("<b>1.</b> livecert #1");
    expect(html).toContain("could not answer directly");
    expect(html).not.toContain("<b>2.</b>");
  });

  it("escapes miner-controlled text", () => {
    const html = secondOpinionHtml(row({ minerSlug: "<script>" }), { ...second, answer: "a & b <i>" }, null, undefined);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b &lt;i&gt;");
  });
});

describe("ledger lookups behind /second", () => {
  it("returns this user's newest answered call and ignores second opinions", async () => {
    const l = new MemoryLedger();
    await l.recordCall(row({ at: "2026-09-01T00:00:00.000Z", preview: "older" }));
    await l.recordCall(row({ at: "2026-09-02T00:00:00.000Z", preview: "newest" }));
    await l.recordCall(row({ at: "2026-09-03T00:00:00.000Z", preview: "a second opinion", kind: "second-opinion" }));
    await l.recordCall(row({ at: "2026-09-04T00:00:00.000Z", preview: "someone else", userHash: "u2" }));

    expect((await l.lastAnswerFor("u1"))?.preview).toBe("newest");
    expect((await l.lastAnswerFor("nobody"))).toBeNull();
  });

  it("skips failed calls and calls with no intent", async () => {
    const l = new MemoryLedger();
    await l.recordCall(row({ at: "2026-09-01T00:00:00.000Z", preview: "good" }));
    await l.recordCall(row({ at: "2026-09-02T00:00:00.000Z", preview: "failed", status: "error" }));
    await l.recordCall(row({ at: "2026-09-03T00:00:00.000Z", preview: "no intent", intent: null }));
    expect((await l.lastAnswerFor("u1"))?.preview).toBe("good");
  });

  it("finds a call from a truncated hash, as Telegram callback data carries", async () => {
    const l = new MemoryLedger();
    await l.recordCall(row());
    const prefix = `0x${"ab".repeat(19)}`; // 40 chars, what fits in callback_data
    expect((await l.answerByHashPrefix(prefix))?.minerSlug).toBe("livecert");
    expect(await l.answerByHashPrefix("0xdeadbeef")).toBeNull();
  });
});
