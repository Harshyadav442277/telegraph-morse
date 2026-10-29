import type { CallRow } from "./ledger/types.js";
import { CHAINS, ETH_SEPOLIA, type Chain } from "./chains.js";
import { payerAddress } from "./telegraph.js";

/**
 * On-chain proof of usage.
 *
 * Every paid Morse call settles as one USDC transfer from the payer wallet to
 * Telegraph's Diamond — on Base Sepolia under V1, Ethereum Sepolia under V2 — and the node hands the transaction hash back in
 * the payment-response header, which the ledger stores as `settlementTx`. So the ledger
 * can be checked against the chain without trusting Morse's database at all: read the
 * payer's outbound transfers from a public indexer and match them hash for hash.
 *
 * Judges are asked to score "actual volume of Telegraph calls". This is that number,
 * read from somewhere Morse does not control.
 */
const MAX_PAGES = 60;
const DIAMONDS = new Set(CHAINS.map((c) => c.diamond.toLowerCase()));
const api = (c: Chain) => `${c.blockscout}/api/v2`;

export interface ChainTransfer {
  /** Which chain the transfer is on: V1 settled on Base Sepolia, V2 on Ethereum Sepolia. */
  chain: string;
  txHash: string;
  to: string;
  usdc: number;
  at: string;
  block: number;
}

export interface Reconciliation {
  payer: string | null;
  chain: {
    /** Outbound USDC transfers from the payer, all recipients. */
    transfers: number;
    /** Of those, transfers to the Diamond: x402 settlements. */
    toDiamond: number;
    usdc: number;
    first: string | null;
    last: string | null;
  };
  ledger: {
    okRows: number;
    withSettlement: number;
  };
  /** Ledger settlement hashes found on chain. */
  matched: number;
  /** Ledger rows whose settlement hash the indexer has not shown yet. */
  ledgerOnly: Array<{ txHash: string; at: string; intent: string | null; minerSlug: string | null }>;
  /** Settlements on chain with no ledger row: calls Morse gave up on that settled anyway. */
  chainOnly: ChainTransfer[];
  source: string;
  fetchedAt: string;
  error: string | null;
}

interface BlockscoutItem {
  from?: { hash?: string };
  to?: { hash?: string };
  total?: { value?: string; decimals?: string };
  transaction_hash?: string;
  timestamp?: string;
  block_number?: number;
}

interface BlockscoutPage {
  items?: BlockscoutItem[];
  next_page_params?: Record<string, unknown> | null;
}

/** Every outbound ERC-20 transfer from `payer`, newest first, paged until the indexer runs out. */
export async function fetchPayerTransfers(payer: string, fetchImpl: typeof fetch = fetch, chain: Chain = ETH_SEPOLIA): Promise<ChainTransfer[]> {
  const out: ChainTransfer[] = [];
  let url: string | null = `${api(chain)}/addresses/${payer}/token-transfers?type=ERC-20`;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(20_000), headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Blockscout returned ${res.status}`);
    const body = (await res.json()) as BlockscoutPage;
    for (const t of body.items ?? []) {
      if ((t.from?.hash ?? "").toLowerCase() !== payer.toLowerCase()) continue;
      const decimals = Number(t.total?.decimals ?? "6");
      out.push({
        chain: chain.name,
        txHash: (t.transaction_hash ?? "").toLowerCase(),
        to: (t.to?.hash ?? "").toLowerCase(),
        usdc: Number(t.total?.value ?? "0") / 10 ** decimals,
        at: t.timestamp ?? "",
        block: Number(t.block_number ?? 0),
      });
    }
    const np = body.next_page_params;
    url = np
      ? `${api(chain)}/addresses/${payer}/token-transfers?type=ERC-20&${new URLSearchParams(
          Object.fromEntries(Object.entries(np).map(([k, v]) => [k, String(v)])),
        )}`
      : null;
  }
  return out;
}

/** Pure: match the ledger's settlement hashes against the chain's transfers. */
export function reconcile(rows: CallRow[], transfers: ChainTransfer[], payer: string | null, fetchedAt = new Date().toISOString()): Reconciliation {
  const ok = rows.filter((r) => r.status === "ok");
  const withTx = rows.filter((r) => r.settlementTx);
  const chainHashes = new Set(transfers.map((t) => t.txHash));
  const ledgerHashes = new Set(withTx.map((r) => r.settlementTx!.toLowerCase()));
  const toDiamond = transfers.filter((t) => DIAMONDS.has(t.to));
  const matched = [...ledgerHashes].filter((h) => chainHashes.has(h)).length;
  const ledgerOnly = withTx
    .filter((r) => !chainHashes.has(r.settlementTx!.toLowerCase()))
    .map((r) => ({ txHash: r.settlementTx!, at: r.at, intent: r.intent, minerSlug: r.minerSlug }));
  const chainOnly = transfers.filter((t) => !ledgerHashes.has(t.txHash));
  const times = transfers.map((t) => t.at).filter(Boolean).sort();
  return {
    payer,
    chain: {
      transfers: transfers.length,
      toDiamond: toDiamond.length,
      usdc: Number(transfers.reduce((a, t) => a + t.usdc, 0).toFixed(6)),
      first: times[0] ?? null,
      last: times.at(-1) ?? null,
    },
    ledger: { okRows: ok.length, withSettlement: withTx.length },
    matched,
    ledgerOnly,
    chainOnly,
    source: CHAINS.map(api).join(" and "),
    fetchedAt,
    error: null,
  };
}

let cache: { at: number; fetchedAt: string; transfers: ChainTransfer[] } | null = null;

/** Reconciliation against the live chain; the chain read is cached for a minute so a page reload is free. */
export async function getReconciliation(rows: CallRow[]): Promise<Reconciliation> {
  const payer = payerAddress();
  if (!payer) return { ...reconcile(rows, [], null), error: "No payer wallet is configured, so there is nothing on chain to reconcile." };
  if (cache && Date.now() - cache.at < 60_000) return reconcile(rows, cache.transfers, payer, cache.fetchedAt);
  const reads = await Promise.allSettled(CHAINS.map((c) => fetchPayerTransfers(payer, fetch, c)));
  const transfers = reads.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failures = reads.flatMap((r, i) => (r.status === "rejected" ? [`${CHAINS[i]!.name}: ${(r.reason as Error).message}`] : []));
  if (failures.length === 0) {
    cache = { at: Date.now(), fetchedAt: new Date().toISOString(), transfers };
    return reconcile(rows, transfers, payer, cache.fetchedAt);
  }
  // Report what was read; a chain that could not be read is named, never treated as empty.
  return { ...reconcile(rows, transfers, payer), error: `Could not read every chain via Blockscout (${failures.join("; ")}).` };
}
