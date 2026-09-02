/**
 * One real paid call, from your machine, with full diagnostics.
 *
 *   npm run first-call
 *
 * Why this exists: the deployed app's payment is refused with a bare 402 carrying the
 * original challenge, which Telegraph's own docs say is what a malformed payload looks
 * like — indistinguishable from sending nothing. This script runs the identical client
 * outside Vercel, so a failure here means the client, and a success here means the
 * serverless runtime (GAPS G17).
 *
 * It spends up to $0.02 of testnet USDC (two attempts, router then direct miner) and
 * stops at the first success. Needs EVM_PRIVATE_KEY in a local .env — the only reason
 * the key ever touches this machine. Delete .env afterwards if you like.
 */
import { readFileSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { normalisePrivateKey } from "../src/config.js";

const NODE = (process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com").replace(/\/+$/, "");
const BASE_SEPOLIA = "eip155:84532" as const;

function loadEnvFile(): void {
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m?.[1] && process.env[m[1]] === undefined) {
        process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    /* no .env is fine if the variable is already exported */
  }
}

async function attempt(
  payFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  label: string,
  path: string,
  body: unknown,
): Promise<boolean> {
  console.log(`\n── ${label}`);
  console.log(`   POST ${NODE}${path}`);
  console.log(`   body ${JSON.stringify(body).slice(0, 160)}`);
  const started = Date.now();
  try {
    const res = await payFetch(`${NODE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const text = await res.text();
    console.log(`   HTTP ${res.status} in ${Date.now() - started} ms`);
    for (const h of ["payment-response", "x-payment-response", "payment-required"]) {
      const v = res.headers.get(h);
      if (v) console.log(`   ${h}: ${v.slice(0, 300)}`);
    }
    if (res.ok) {
      const j = JSON.parse(text) as { miner_name?: string; intent?: string; cost_usd?: number; signal_hash?: string };
      console.log(`   PAID AND ANSWERED`);
      console.log(`   miner ${j.miner_name} · intent ${j.intent} · $${j.cost_usd} · hash ${j.signal_hash}`);
      console.log(`   verify: https://telegraph-morse.vercel.app/verify/${j.signal_hash}`);
      return true;
    }
    console.log(`   body: ${text.replace(/\s+/g, " ").slice(0, 400)}`);
  } catch (e) {
    console.log(`   threw after ${Date.now() - started} ms: ${(e as Error).message.slice(0, 400)}`);
  }
  return false;
}

async function main(): Promise<void> {
  loadEnvFile();
  const pk = normalisePrivateKey(process.env["EVM_PRIVATE_KEY"]);
  if (!pk) {
    console.error("Set EVM_PRIVATE_KEY in .env (64 hex characters, 0x optional).");
    process.exitCode = 1;
    return;
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log(`payer ${account.address}`);
  console.log(`node  ${NODE}`);
  console.log(`x402  @x402/fetch ${JSON.parse(readFileSync("node_modules/@x402/fetch/package.json", "utf8")).version}`);
  console.log(`node  ${process.version}`);

  const client = x402Client.fromConfig({
    schemes: [{ network: BASE_SEPOLIA, client: new ExactEvmScheme(toClientEvmSigner(account)) }],
  });
  const payFetch = wrapFetchWithPayment(globalThis.fetch, client);

  // 1. The router, which is what Morse uses.
  if (await attempt(payFetch, "routed ask", "/engine/v1/ask", { query: "What is the current price of Bitcoin?" })) return;

  // 2. A direct miner call, the form Telegraph's docs walk through. If this succeeds
  //    and the router does not, the problem is the router path, not the payment.
  const miners = (await (await fetch(`${NODE}/api/miners?intent=CRYPTO_PRICE&status=active&limit=5`)).json()) as
    | { miners?: Array<{ id: string | number; slug: string; endpoints?: Array<{ path: string; method?: string }> }> }
    | Array<{ id: string | number; slug: string; endpoints?: Array<{ path: string; method?: string }> }>;
  const list = Array.isArray(miners) ? miners : (miners.miners ?? []);
  const m = list.find((x) => (x.endpoints?.length ?? 0) > 0);
  if (!m) {
    console.log("\nno CRYPTO_PRICE miner with an endpoint to try directly");
    return;
  }
  const ep = m.endpoints![0]!;
  await attempt(payFetch, `direct miner ${m.slug} (id ${m.id})`, `/engine/v1/ask/${m.id}`, {
    method: (ep.method ?? "GET").toUpperCase(),
    endpoint: ep.path,
    payload: { query: "What is the current price of Bitcoin?" },
  });
}

main().catch((e) => {
  console.error(`first-call failed to run: ${(e as Error).message}`);
  process.exitCode = 1;
});
