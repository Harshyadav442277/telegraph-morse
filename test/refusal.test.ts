import { beforeEach, describe, expect, it, vi } from "vitest";

// A miner that answers only to say it could not (GAPS G38). The real payload from
// telegraph-verity-intelligence on 2026-10-27, asked about github.com's certificate.
const REFUSAL = {
  answer: { authorized: false, hostname: "", port: 443 },
  confidence: 1,
  evidence: [],
  uncertainty: [{ code: "invalid_hostname", message: "A hostname is required." }],
  verdict: "rejected",
};
const verity = { id: "5530", slug: "telegraph-verity-intelligence", signal_mapping: { confidence_field: "confidence", label_field: "verdict" }, endpoints: [{ path: "/v1/intent", method: "POST" }] };
const livecert = { id: "4433", slug: "livecert", signal_mapping: { confidence_field: "confidence", label_field: "verdict", reason_field: "reason" }, endpoints: [{ path: "/ssl-check", method: "GET" }] };
const settled = (txHash: string) => ({ success: true, txHash, payer: "0xpayer", errorReason: null });

let useRouter = true;
vi.mock("../src/config.js", () => ({ config: () => ({ USE_ENGINE_ROUTER: useRouter }) }));
vi.mock("../src/core/guards.js", () => ({ guardPaid: async () => ({ allowed: true, remaining: 9, reason: null }) }));
vi.mock("../src/core/telegraph.js", async (orig) => ({
  ...(await orig<typeof import("../src/core/telegraph.js")>()),
  askRouted: vi.fn(),
  askMiner: vi.fn(),
  resolveMiner: vi.fn(async () => verity),
  rankOf: () => null,
  withEndpointIntents: async (m: unknown) => m,
}));
vi.mock("../src/core/route.js", async (orig) => ({
  ...(await orig<typeof import("../src/core/route.js")>()),
  routeCandidates: vi.fn(async () => [
    { intent: "SSL_VERIFICATION", miner: verity, rank: 1, why: "it names a certificate" },
    { intent: "SSL_VERIFICATION", miner: livecert, rank: 2, why: "it names a certificate" },
  ]),
}));

const { askNetwork } = await import("../src/core/ask.js");
const telegraph = await import("../src/core/telegraph.js");
const { setLedgerForTests } = await import("../src/core/ledger/index.js");
const { MemoryLedger } = await import("../src/core/ledger/memory.js");

const ctx = { channel: "web" as const, userHash: "u1" };
const Q = "Is the SSL certificate for github.com valid, and who issued it?";
let ledger: InstanceType<typeof MemoryLedger>;

beforeEach(() => {
  vi.mocked(telegraph.askRouted).mockReset();
  vi.mocked(telegraph.askMiner).mockReset();
  ledger = new MemoryLedger();
  setLedgerForTests(ledger);
});

describe("a miner that answers only to say it could not", () => {
  it("falls back from the router's refused pick to another miner, keeping the paid row", async () => {
    useRouter = true;
    vi.mocked(telegraph.askRouted).mockResolvedValue({ miner_id: "5530", miner_name: "Telegraph Verity Intelligence", intent: "SSL_VERIFICATION", result: REFUSAL, cost_usd: 0.01, signal_hash: "0xs1", settlement: settled("0xt1") });
    vi.mocked(telegraph.askMiner).mockResolvedValue({ result: { verdict: "valid", confidence: 0.98, reason: "Chain trusted; issued by Sectigo." }, cost_usd: 0.01, signal_hash: "0xs2", settlement: settled("0xt2") });

    const card = await askNetwork(ctx, Q);

    expect(card.ok).toBe(true);
    expect(card.receipt?.minerSlug).toBe("livecert");
    expect(card.receipt?.answer).toBe("Chain trusted; issued by Sectigo.");
    expect(card.receipt?.routerReasoning).toMatch(/picked telegraph-verity-intelligence, which could not answer \("A hostname is required\."\)/);
    // The refused miner is not asked again directly.
    expect(vi.mocked(telegraph.askMiner)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(telegraph.askMiner).mock.calls[0]?.[0]).toBe("4433");
    const rows = await ledger.recent(10);
    const refused = rows.find((r) => r.settlementTx === "0xt1");
    expect(refused).toMatchObject({ status: "error", routedBy: "engine", confidence: null, error: "miner could not answer: A hostname is required." });
    expect(rows.find((r) => r.settlementTx === "0xt2")).toMatchObject({ status: "ok", routedBy: "morse", minerSlug: "livecert" });
  });

  it("reports a refusal on Morse's own route without paying a second miner", async () => {
    useRouter = false;
    vi.mocked(telegraph.askMiner).mockResolvedValue({ result: REFUSAL, cost_usd: 0.01, signal_hash: "0xs3", settlement: settled("0xt3") });

    const card = await askNetwork(ctx, Q);

    expect(card.ok).toBe(false);
    expect(card.error).toBe("telegraph-verity-intelligence could not answer: A hostname is required. The call was settled on chain, so it was charged.");
    expect(vi.mocked(telegraph.askMiner)).toHaveBeenCalledTimes(1);
    const [row] = await ledger.recent(10);
    expect(row).toMatchObject({ status: "error", settlementTx: "0xt3", minerSlug: "telegraph-verity-intelligence" });
  });
});
