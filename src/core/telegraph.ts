import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { config } from "../config.js";
import type { EngineAsk, SignalMapping } from "./receipt.js";

/**
 * Telegraph client. Paid calls go through an x402-wrapped fetch that answers the
 * 402 challenge with an EIP-3009 authorisation signed by the app's burner key
 * (ARCHITECTURE A1). Discovery and verification endpoints are free and use plain fetch.
 */
export type TelegraphErrorKind = "unpaid" | "timeout" | "engine" | "network";

export class TelegraphError extends Error {
  constructor(
    message: string,
    readonly kind: TelegraphErrorKind,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "TelegraphError";
  }
}

const BASE_SEPOLIA = "eip155:84532" as const;
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

let paying: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null = null;

function node(): string {
  return config().TELEGRAPH_NODE.replace(/\/+$/, "");
}

export function payerAddress(): `0x${string}` | null {
  const pk = config().EVM_PRIVATE_KEY;
  if (!pk) return null;
  try {
    return privateKeyToAccount(pk as `0x${string}`).address;
  } catch {
    return null;
  }
}

function payingFetch() {
  if (paying) return paying;
  const pk = config().EVM_PRIVATE_KEY;
  if (!pk) throw new TelegraphError("No payer wallet is configured.", "unpaid");
  const account = privateKeyToAccount(pk as `0x${string}`);
  // Constructed exactly as telegraphprotocol/Telegraph-MCP does, on the same pinned
  // @x402/* version: one-argument signer, x402Client.fromConfig, wrapFetchWithPayment.
  // That is the only client known to be accepted by this node; a payload it does not
  // like comes back as a bare 402, indistinguishable from sending nothing (GAPS G17).
  const signer = toClientEvmSigner(account);
  const client = x402Client.fromConfig({
    schemes: [{ network: BASE_SEPOLIA, client: new ExactEvmScheme(signer) }],
  });
  // Materialise the Request before the payment wrapper sees it. Handing it a
  // (url, init) pair works locally but not on Vercel, where the retry went out
  // without the payment header and the node answered with a bare challenge; building
  // the Request first makes the wrapper's clone carry headers and body correctly.
  // Established empirically — the exact undici interaction is not pinned down, so do
  // not "simplify" this away without re-testing a paid call on the deployment (GAPS G17).
  const normalising: typeof globalThis.fetch = (input, init) =>
    globalThis.fetch(new Request(input as RequestInfo, init));
  paying = wrapFetchWithPayment(normalising, client);
  return paying;
}

async function paidPost(path: string, body: unknown, timeoutMs: number): Promise<EngineAsk> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await payingFetch()(`${node()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const text = await res.text();
    if (res.status === 402) {
      // Keep what the node actually said: a bare "payment refused" is undiagnosable,
      // and this path only runs when a payment attempt has already been made.
      const settled = decodeSettlement(res.headers.get("payment-response") ?? res.headers.get("x-payment-response"));
      console.error("402 after payment attempt:", settled?.errorReason ?? snippet(text));
      throw new TelegraphError(
        settled?.errorReason
          ? `The node refused the payment: ${settled.errorReason}`
          : `Payment was not accepted by the node: ${snippet(text)}`,
        "unpaid",
        402,
      );
    }
    if (res.status === 422) {
      throw new TelegraphError(`The node predicted this request would fail: ${snippet(text)}`, "engine", 422);
    }
    if (!res.ok) throw new TelegraphError(`Engine returned ${res.status}: ${snippet(text)}`, "engine", res.status);
    const parsed = JSON.parse(text) as EngineAsk;
    if (typeof parsed.duration_ms !== "number") parsed.duration_ms = Date.now() - started;
    // The settlement transaction is published only here, in the payment-response
    // header — the signal record the node serves later does not carry it (GAPS G3b).
    parsed.settlement = decodeSettlement(res.headers.get("payment-response") ?? res.headers.get("x-payment-response"));
    return parsed;
  } catch (e) {
    if (e instanceof TelegraphError) throw e;
    if ((e as Error).name === "AbortError") {
      throw new TelegraphError(`The network did not answer within ${Math.round(timeoutMs / 1000)}s.`, "timeout");
    }
    const msg = (e as Error).message;
    // x402 throws before the wire when it cannot build a payment (no matching scheme,
    // spend controls, signing failure). That is not a network problem and must not
    // be reported as one.
    if (/payment|scheme|signer|sign|spend|insufficient|authoriz/i.test(msg)) {
      console.error("payment construction failed:", msg);
      throw new TelegraphError(`Could not construct a payment: ${msg}`, "unpaid");
    }
    throw new TelegraphError(`Could not reach the Telegraph node: ${msg}`, "network");
  } finally {
    clearTimeout(timer);
  }
}

export interface Settlement {
  success: boolean;
  txHash: string | null;
  payer: string | null;
  errorReason: string | null;
}

/** The node's `payment-response` header: base64 JSON, present on success and failure. */
export function decodeSettlement(header: string | null): Settlement | null {
  if (!header) return null;
  try {
    const j = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
      success?: boolean;
      transaction?: string;
      payer?: string;
      errorReason?: string;
    };
    return {
      success: j.success === true,
      txHash: j.transaction && /^0x[0-9a-fA-F]{64}$/.test(j.transaction) ? j.transaction : null,
      payer: j.payer ?? null,
      errorReason: j.errorReason ?? null,
    };
  } catch {
    return null;
  }
}

function snippet(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 200);
}

/** Auto-routed ask: the Engine's router classifies the intent and picks the miner. */
export function ask(query: string, timeoutMs = config().ASK_TIMEOUT_MS, context?: Record<string, unknown>): Promise<EngineAsk> {
  return paidPost("/engine/v1/ask", context ? { query, context } : { query }, timeoutMs);
}

/** Direct ask: skip routing and call one miner's endpoint. Used for second opinions only. */
export function askMiner(
  minerId: string,
  req: { method: "GET" | "POST"; endpoint: string; payload: Record<string, unknown> },
  timeoutMs = config().ASK_TIMEOUT_MS,
): Promise<EngineAsk> {
  return paidPost(`/engine/v1/ask/${encodeURIComponent(minerId)}`, req, timeoutMs);
}

async function freeJson<T>(path: string, timeoutMs = 15_000): Promise<T> {
  const res = await fetch(`${node()}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new TelegraphError(`${path} returned ${res.status}`, "network", res.status);
  return (await res.json()) as T;
}

export interface SignalRecord {
  signal_hash?: string;
  kind?: string;
  signal?: { wallet_address?: string; miner_slug?: string; subnet_id?: string; tx_hash?: string; created_at?: string };
  payload?: unknown;
  result?: unknown;
  /**
   * The node's own attestation that the hash commits to the payload. Observed on
   * 8/8 user-paid signals (2026-09-02): {algorithm: "keccak256", commitment:
   * "payload", verified: true}. Morse shows it; it does not recompute it (GAPS G3).
   */
  verification?: { algorithm?: string; commitment?: string; verified?: boolean };
}

export function verifySignal(hash: string): Promise<SignalRecord> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new TelegraphError("Not a signal hash.", "engine", 400);
  return freeJson<SignalRecord>(`/engine/v1/signal/${hash}`);
}

// ---------------------------------------------------------------------------
// Catalogue: miners, intents, leaderboard. Cached briefly; never used for answers.

export interface MinerEndpoint { path: string; method?: string; description?: string }
export interface MinerScore { intent_id: string; epoch_id: number; rank: number; score: number }
export interface Miner {
  id: string;
  slug: string;
  name?: string;
  supported_intents?: string[];
  signal_mapping?: SignalMapping | null;
  scores?: MinerScore[];
  endpoints?: MinerEndpoint[];
  input_schema?: { properties?: Record<string, unknown>; required?: string[] } | null;
  activation_status?: string;
  min_price_usdc?: number;
  total_requests_served?: number;
}

export interface IntentInfo { intent_id: string; miner_count: number; description?: string }

let minersCache: { at: number; miners: Miner[] } | null = null;
let intentsCache: { at: number; intents: IntentInfo[] } | null = null;

export async function getMiners(): Promise<Miner[]> {
  if (minersCache && Date.now() - minersCache.at < 60_000) return minersCache.miners;
  const body = await freeJson<unknown>("/api/miners", 25_000);
  const miners = (Array.isArray(body) ? body : ((body as { miners?: Miner[] }).miners ?? [])) as Miner[];
  minersCache = { at: Date.now(), miners: miners.map((m) => ({ ...m, id: String(m.id) })) };
  return minersCache.miners;
}

export async function getIntents(): Promise<IntentInfo[]> {
  if (intentsCache && Date.now() - intentsCache.at < 300_000) return intentsCache.intents;
  const body = await freeJson<{ intents?: IntentInfo[] }>("/engine/v1/intents");
  intentsCache = { at: Date.now(), intents: body.intents ?? [] };
  return intentsCache.intents;
}

export async function minerBySlug(slug: string | null | undefined): Promise<Miner | null> {
  if (!slug) return null;
  return (await getMiners()).find((m) => m.slug === slug) ?? null;
}

export function rankOf(miner: Miner | null, intent: string | null): number | null {
  if (!miner || !intent) return null;
  return miner.scores?.find((s) => s.intent_id === intent)?.rank ?? null;
}

/** Active miners serving `intent`, best rank first; unscored miners last. */
export async function leaderboard(intent: string): Promise<Array<{ miner: Miner; rank: number | null; score: number | null }>> {
  const miners = (await getMiners()).filter(
    (m) => m.activation_status === "active" && (m.supported_intents ?? []).includes(intent),
  );
  return miners
    .map((m) => {
      const s = m.scores?.find((x) => x.intent_id === intent);
      return { miner: m, rank: s?.rank ?? null, score: s?.score ?? null };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
}

export interface HotSignal {
  question?: { text?: string; category?: string; interest_score?: number };
  routing?: { miner_slug?: string; intent?: string };
  signal_hash?: string;
  created_at?: string;
}

export async function hotSignals(limit = 5, sinceHours = 24): Promise<HotSignal[]> {
  const body = await freeJson<{ results?: HotSignal[] }>(
    `/daemon/api/questions/top?since_hours=${sinceHours}&limit=${Math.min(50, Math.max(1, limit))}`,
  );
  return body.results ?? [];
}

/** USDC balance of the payer, read from the chain over a public RPC. Free. */
export async function payerUsdcBalance(): Promise<number | null> {
  const addr = payerAddress();
  if (!addr) return null;
  try {
    const client = createPublicClient({ chain: baseSepolia, transport: http() });
    const raw = (await client.readContract({
      address: USDC_BASE_SEPOLIA,
      abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }],
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;
    return Number(raw) / 1e6;
  } catch {
    return null;
  }
}

/** Test seam. */
export function resetTelegraphForTests(): void {
  paying = null;
  minersCache = null;
  intentsCache = null;
}
