import { describe, expect, it } from "vitest";
import type { CallRow } from "../src/core/ledger/types.js";
import { DIAMOND, fetchPayerTransfers, reconcile, type ChainTransfer } from "../src/core/proof.js";

const PAYER = "0xfbb3c3bd51ec6e19bdecc786945d83719b6b4c9c";

function row(over: Partial<CallRow> = {}): CallRow {
  return {
    id: Math.random().toString(36), at: "2026-09-03T10:00:00.000Z", channel: "web", userHash: "u", kind: "ask",
    preview: "q", intent: "SSL_VERIFICATION", minerSlug: "livecert", minerId: "4433", minerRank: 1, confidence: null,
    costUsd: 0.01, durationMs: 100, signalHash: `0x${"a".repeat(64)}`, settlementTx: null, routedBy: "engine",
    label: null, answer: null, groupId: null, status: "ok", error: null, ...over,
  };
}

function transfer(txHash: string, over: Partial<ChainTransfer> = {}): ChainTransfer {
  return { txHash, to: DIAMOND.toLowerCase(), usdc: 0.01, at: "2026-09-03T10:00:05.000Z", block: 1, ...over };
}

describe("reconcile", () => {
  it("matches ledger settlement hashes against chain transfers, hash for hash", () => {
    const rows = [row({ settlementTx: "0xAA" }), row({ settlementTx: "0xbb" }), row({ status: "error", settlementTx: null })];
    const chain = [transfer("0xaa"), transfer("0xbb"), transfer("0xcc")];
    const r = reconcile(rows, chain, PAYER);
    expect(r.ledger).toEqual({ okRows: 2, withSettlement: 2 });
    expect(r.chain.toDiamond).toBe(3);
    expect(r.chain.usdc).toBe(0.03);
    expect(r.matched).toBe(2);
    expect(r.ledgerOnly).toEqual([]);
    expect(r.chainOnly.map((t) => t.txHash)).toEqual(["0xcc"]);
    expect(r.error).toBeNull();
  });

  it("names ledger rows the chain has not shown, and never counts them as matched", () => {
    const r = reconcile([row({ settlementTx: "0xdd", intent: "URL_SCAN", minerSlug: "netwire-url-scan" })], [], PAYER);
    expect(r.matched).toBe(0);
    expect(r.ledgerOnly).toEqual([{ txHash: "0xdd", at: "2026-09-03T10:00:00.000Z", intent: "URL_SCAN", minerSlug: "netwire-url-scan" }]);
    expect(r.chain.first).toBeNull();
  });

  it("separates settlements to the Diamond from other outbound transfers", () => {
    const chain = [transfer("0x01"), transfer("0x02", { to: "0x000000000000000000000000000000000000dead", usdc: 5 })];
    const r = reconcile([], chain, PAYER);
    expect(r.chain.transfers).toBe(2);
    expect(r.chain.toDiamond).toBe(1);
    expect(r.chain.usdc).toBe(5.01);
  });
});

describe("fetchPayerTransfers", () => {
  it("pages until the indexer runs out, keeps only outbound transfers, and scales by decimals", async () => {
    const pages: Record<string, unknown> = {
      first: {
        items: [
          { from: { hash: PAYER.toUpperCase() }, to: { hash: DIAMOND }, total: { value: "10000", decimals: "6" }, transaction_hash: "0xA1", timestamp: "2026-09-03T10:00:00Z", block_number: 10 },
          { from: { hash: "0x1111111111111111111111111111111111111111" }, to: { hash: PAYER }, total: { value: "20000000", decimals: "6" }, transaction_hash: "0xfaucet", timestamp: "2026-09-02T10:00:00Z", block_number: 9 },
        ],
        next_page_params: { block_number: 9, index: 3 },
      },
      second: {
        items: [{ from: { hash: PAYER }, to: { hash: DIAMOND }, total: { value: "15000", decimals: "6" }, transaction_hash: "0xa2", timestamp: "2026-09-03T09:00:00Z", block_number: 8 }],
        next_page_params: null,
      },
    };
    const seen: string[] = [];
    const fake = (async (url: string | URL | Request) => {
      const u = String(url);
      seen.push(u);
      const body = u.includes("block_number=9") ? pages["second"] : pages["first"];
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    const out = await fetchPayerTransfers(PAYER, fake);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain("block_number=9");
    expect(seen[1]).toContain("index=3");
    expect(out.map((t) => [t.txHash, t.usdc])).toEqual([["0xa1", 0.01], ["0xa2", 0.015]]);
  });

  it("fails loudly on a non-200 instead of reporting zero usage", async () => {
    const fake = (async () => new Response("nope", { status: 503 })) as typeof fetch;
    await expect(fetchPayerTransfers(PAYER, fake)).rejects.toThrow(/503/);
  });
});
