import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
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

/**
 * Telegraph V2 settles on Ethereum Sepolia in its own mintable test USDC. Until the V2
 * cutover (between 2026-10-27 18:35 and 2026-10-29) it was Base Sepolia and Circle's
 * USDC `0x036CbD53…dCF7e`; the node's 402 now offers only this network (GAPS G39).
 */
export const PAY_NETWORK = "eip155:11155111" as const;
export const USDC = "0xcc194e1a843B658526D0D5C431f670028582Ae17" as const;
/** Telegraph's V2 Diamond on Ethereum Sepolia: the 402's `payTo`, and where prefixes are read. */
export const DIAMOND = "0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b" as const;
/** Per-payment ceiling for that token, in atomic units: $1. */
export const SPEND_CAP_ATOMIC = "1000000";
/** The RPC Telegraph's own docs use; viem's default for sepolia is rate-limited. */
export const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

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
    schemes: [{ network: PAY_NETWORK, client: new ExactEvmScheme(signer) }],
    // Telegraph's mintable USDC is not in the client's default-asset table, so the
    // default spend controls refuse every V2 challenge. Allow that one token, capped at
    // the same $1 a payment the default would have applied (1_000_000 = 6 decimals).
    spendControls: { allowedAssets: [{ network: PAY_NETWORK, asset: USDC, maxAmountPerPayment: SPEND_CAP_ATOMIC }] },
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

/**
 * The Engine's own router: it classifies the intent with an LLM and picks the miner.
 * Better classification than Morse's keyword rules, so it is tried first — but it
 * broke once (settlement timing out at ~47s, 2026-09-02) and was healthy again at
 * 6.5s the next day, so callers must be ready to fall back. Give it a short timeout:
 * its failure mode is slow, and the fallback still needs room inside 60s (GAPS G17).
 */
export function askRouted(query: string, timeoutMs = config().ROUTER_TIMEOUT_MS): Promise<EngineAsk> {
  return paidPost("/engine/v1/ask", { query }, timeoutMs);
}

/** Direct ask: skip routing and call one named miner's endpoint, as `/miner` does. */
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
  /** The registered manifest. The catalogue strips per-endpoint intents; the manifest keeps them. */
  yaml_url?: string;
  /** endpoint path → intents it serves, read from the manifest by `withEndpointIntents`. */
  endpoint_intents?: Record<string, string[]>;
}

export interface IntentInfo { intent_id: string; miner_count: number; description?: string }

/**
 * Which endpoint serves which intent, from the miner's own YAML.
 *
 * `/api/miners` returns each endpoint as {path, method, description} and drops the
 * `intents` list the manifest declares, so a direct call to a multi-endpoint miner had
 * to guess from the description. For livecert every guess failed and every podium leg
 * went to its first endpoint, /ssl-check, which honestly answered "no hostname was
 * supplied" to weather and paper questions (GAPS G30). The manifest is the source the
 * node itself validated, so read that, once per miner per hour, and never throw: a
 * missing or unreachable manifest just leaves the old guess in place.
 */
const manifestCache = new Map<string, { at: number; intents: Record<string, string[]> }>();

/** Line-based: `- path:` opens an endpoint, the first `intents:` after it closes it. */
export function parseEndpointIntents(yaml: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let path: string | null = null;
  let block: string | null = null;
  for (const raw of yaml.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "");
    const p = line.match(/^\s*-\s*path:\s*["']?(\/\S*?)["']?\s*$/);
    if (p) { path = p[1]!; block = null; continue; }
    if (!path) continue;
    const flow = line.match(/^\s*intents:\s*\[(.*)\]\s*$/);
    if (flow && !(path in out)) {
      out[path] = flow[1]!.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter((s) => /^[A-Z][A-Z0-9_]+$/.test(s));
      path = null;
      continue;
    }
    if (/^\s*intents:\s*$/.test(line) && !(path in out)) { block = path; out[path] = []; continue; }
    if (block) {
      const item = line.match(/^\s*-\s*["']?([A-Z][A-Z0-9_]+)["']?\s*$/);
      if (item) { out[block]!.push(item[1]!); continue; }
      if (line.trim()) { block = null; path = null; }
    }
  }
  return out;
}

export async function withEndpointIntents(miner: Miner, timeoutMs = 6_000): Promise<Miner> {
  if (miner.endpoint_intents || (miner.endpoints?.length ?? 0) < 2 || !miner.yaml_url) return miner;
  const hit = manifestCache.get(miner.id);
  if (hit && Date.now() - hit.at < 3_600_000) return { ...miner, endpoint_intents: hit.intents };
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(miner.yaml_url, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) return miner;
    const intents = parseEndpointIntents(await res.text());
    manifestCache.set(miner.id, { at: Date.now(), intents });
    return { ...miner, endpoint_intents: intents };
  } catch {
    return miner;
  }
}

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

/**
 * V2 intents are a registered prefix, `_`, then a suffix: `SSL_VERIFICATION_CERT`,
 * `STOCK_PRICE_US_EQUITY`. Miners register only the suffixed names, and an intent
 * belongs to its longest matching prefix — `WEATHER_FORECAST_VERIFY_GENERAL` is not in
 * `WEATHER_FORECAST`. Morse classifies into prefixes and resolves them here (GAPS G39).
 * Without the prefix list (RPC down), the last `_word` is taken as the suffix.
 */
export function familyOf(intent: string, prefixes: readonly string[] = prefixCache?.prefixes ?? []): string {
  let best = "";
  for (const p of prefixes) if (p.length > best.length && intent.startsWith(`${p}_`)) best = p;
  if (best) return best;
  const i = intent.lastIndexOf("_");
  return i > 0 ? intent.slice(0, i) : intent;
}

let prefixCache: { at: number; prefixes: string[] } | null = null;

/** The protocol's intent prefixes, read from the Diamond. Free; cached an hour; [] on failure. */
export async function getPrefixes(): Promise<string[]> {
  if (prefixCache && Date.now() - prefixCache.at < 3_600_000) return prefixCache.prefixes;
  try {
    const client = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC, { timeout: 8_000 }) });
    const [names] = (await client.readContract({
      address: DIAMOND,
      abi: [{ name: "getPrefixes", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string[]" }, { type: "uint8[]" }] }],
      functionName: "getPrefixes",
    })) as readonly [readonly string[], readonly number[]];
    prefixCache = { at: Date.now(), prefixes: [...names] };
  } catch (e) {
    console.error("getPrefixes failed, using the last-word rule:", (e as Error).message.slice(0, 200));
    return prefixCache?.prefixes ?? [];
  }
  return prefixCache.prefixes;
}

/** Live intents in a family, most-served first. A name that is itself live resolves to itself. */
export async function intentsInFamily(family: string): Promise<string[]> {
  const prefixes = await getPrefixes();
  return (await getIntents())
    .filter((i) => i.miner_count > 0 && (i.intent_id === family || familyOf(i.intent_id, prefixes) === family))
    .sort((a, b) => b.miner_count - a.miner_count)
    .map((i) => i.intent_id);
}

export async function minerById(id: string | number | null | undefined): Promise<Miner | null> {
  if (id === null || id === undefined) return null;
  const s = String(id);
  return (await getMiners()).find((m) => m.id === s) ?? null;
}

/**
 * The Engine's `miner_name` is the miner's display name ("TxLens", "PREFLIGHT
 * Infrastructure Signals"), not its slug, and `miner_id` is the catalogue id. Looking
 * a router answer up by slug therefore found nothing, which silently dropped the rank
 * and the signal mapping from every engine-routed receipt. Resolve by id first.
 */
export async function resolveMiner(ref: { id?: string | number | null; name?: string | null }): Promise<Miner | null> {
  const byId = await minerById(ref.id);
  if (byId) return byId;
  const miners = await getMiners();
  if (!ref.name) return null;
  return miners.find((m) => m.slug === ref.name) ?? miners.find((m) => m.name === ref.name) ?? null;
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
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || ownLast(a.miner) - ownLast(b.miner));
}

/**
 * Miners the Morse operator also runs. Under V2 most intents are not ranked yet (70 of
 * 1,872 miners scored on 2026-10-29), and catalogue order put livecert first for SSL,
 * crypto price and fact check. Morse's own routing must not favour the operator's
 * miner: a rank still wins, but among unranked miners these go last (GAPS G39).
 */
const OPERATOR_MINERS = new Set(["livecert"]);
const ownLast = (m: Miner) => (OPERATOR_MINERS.has(m.slug) ? 1 : 0);

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
    const client = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });
    const raw = (await client.readContract({
      address: USDC,
      abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }],
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;
    return Number(raw) / 1e6;
  } catch {
    return null;
  }
}
