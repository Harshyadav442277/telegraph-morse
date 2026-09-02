/**
 * Preflight for the first real paid call. Run it the moment EVM_PRIVATE_KEY is set,
 * before spending anything.
 *
 *   npm run preflight
 *
 * It spends nothing: it reads the payer's balances over a public RPC, asks the node
 * for its 402 challenge without paying it, and checks that challenge field by field
 * against what our own x402 client is configured to satisfy. It imports the real
 * modules — `payerAddress`, `USDC_BASE_SEPOLIA`, `config` — so it verifies the code
 * path Morse actually uses, not a copy of it.
 *
 * Exit 0 = everything checkable is green and the one real call is worth making.
 * Exit 1 = something would have failed. Fix it before spending.
 */
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import * as x402evm from "@x402/evm";

/** 2.11.0 does not export DEFAULT_ASSETS; 2.24.0 does. Treat it as optional. */
const DEFAULT_ASSETS = (x402evm as { DEFAULT_ASSETS?: Record<string, Array<{ asset: string; version?: string }>> })
  .DEFAULT_ASSETS;
import { config, paidWorkEnabled } from "../src/config.js";
import { payerAddress, payerUsdcBalance, USDC_BASE_SEPOLIA } from "../src/core/telegraph.js";

const BASE_SEPOLIA_CAIP2 = "eip155:84532";
/** @x402/core's DEFAULT_MAX_AMOUNT_PER_PAYMENT, as a number of dollars. */
const CLIENT_CAP_USD = 1;

interface Accept {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: { name?: string; version?: string };
}

const problems: string[] = [];
const unproven: string[] = [];

function check(ok: boolean, label: string, detail: string): void {
  console.log(`${ok ? "  ok   " : "  FAIL "}${label.padEnd(30)}${detail}`);
  if (!ok) problems.push(`${label}: ${detail}`);
}

async function challenge(): Promise<Accept | null> {
  const node = config().TELEGRAPH_NODE.replace(/\/+$/, "");
  const res = await fetch(`${node}/engine/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "preflight: challenge probe, not paid" }),
    signal: AbortSignal.timeout(40_000),
  });
  if (res.status !== 402) {
    problems.push(`the node answered ${res.status}, not 402 — cannot read the payment challenge`);
    return null;
  }
  const header = res.headers.get("payment-required");
  if (!header) {
    problems.push("the 402 carried no Payment-Required header");
    return null;
  }
  const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
    x402Version: number;
    accepts: Accept[];
  };
  console.log(`  x402 version ${decoded.x402Version}, ${decoded.accepts.length} payment options offered`);
  return decoded.accepts.find((a) => a.network.startsWith("eip155")) ?? null;
}

async function main(): Promise<void> {
  const cfg = config();

  console.log("\nWALLET");
  const payer = payerAddress();
  check(Boolean(payer), "payer key", payer ? `derives ${payer}` : "EVM_PRIVATE_KEY is not set or malformed");
  const whyNotPaid = !payer
    ? "no payer key"
    : cfg.DAILY_BUDGET_CALLS === 0
      ? "DAILY_BUDGET_CALLS is 0"
      : cfg.KILL_SWITCH
        ? "KILL_SWITCH is on"
        : "";
  check(
    paidWorkEnabled(cfg),
    "paid work enabled",
    whyNotPaid ? `blocked: ${whyNotPaid}` : `budget ${cfg.DAILY_BUDGET_CALLS}/day, kill switch off`,
  );

  if (payer) {
    const client = createPublicClient({ chain: baseSepolia, transport: http() });
    const [usdc, wei] = await Promise.all([payerUsdcBalance(), client.getBalance({ address: payer })]);
    check((usdc ?? 0) > 0, "USDC on Base Sepolia", `${usdc ?? "unreadable"} USDC — top up at faucet.circle.com`);
    const eth = Number(formatEther(wei));
    // EIP-3009 means the facilitator should submit the transfer, so the payer needs no
    // gas. That is the one thing preflight cannot prove; report it either way.
    console.log(`  note   ${"payer ETH".padEnd(30)}${eth} ETH — expected to be unnecessary (facilitator pays gas)`);
    if (eth === 0) unproven.push("the payer holds no Base Sepolia ETH, so the first call also tests the gasless (EIP-3009) assumption");
  }

  console.log("\nTHE NODE'S 402 CHALLENGE (fetched, not paid)");
  const accept = await challenge();
  if (accept) {
    const dflt = DEFAULT_ASSETS?.[BASE_SEPOLIA_CAIP2]?.[0];
    const priceUsd = Number(accept.amount) / 1e6;
    check(accept.scheme === "exact", "scheme", `${accept.scheme} — we register ExactEvmScheme`);
    check(accept.network === BASE_SEPOLIA_CAIP2, "network", `${accept.network} — we register ${BASE_SEPOLIA_CAIP2}`);
    check(
      accept.asset.toLowerCase() === USDC_BASE_SEPOLIA.toLowerCase(),
      "asset vs our constant",
      `${accept.asset}`,
    );
    if (dflt) {
      check(
        accept.asset.toLowerCase() === dflt.asset.toLowerCase(),
        "asset vs DEFAULT_ASSETS",
        `${dflt.asset} — so the client's default spend controls permit it`,
      );
      check(
        accept.extra?.version === dflt.version,
        "EIP-712 domain version",
        `challenge says "${accept.extra?.version}", client assumes "${dflt.version}"`,
      );
    } else {
      console.log(`  note   ${"spend controls".padEnd(30)}this @x402 version exposes no DEFAULT_ASSETS table; nothing to cross-check`);
    }
    check(priceUsd <= CLIENT_CAP_USD, "price vs client cap", `$${priceUsd.toFixed(4)} against the $${CLIENT_CAP_USD} default cap`);
    check(
      cfg.ASK_TIMEOUT_MS / 1000 <= accept.maxTimeoutSeconds,
      "our timeout vs theirs",
      `we abort at ${cfg.ASK_TIMEOUT_MS / 1000}s, the node allows ${accept.maxTimeoutSeconds}s`,
    );
    console.log(`  note   ${"paying to".padEnd(30)}${accept.payTo}`);
  }

  unproven.push("the EIP-3009 signature itself, and the facilitator settling it on-chain");
  unproven.push("the signal_hash coming back and resolving at /verify");

  console.log("\nSTILL UNPROVEN — only a real call settles these");
  for (const u of unproven) console.log(`  · ${u}`);

  if (problems.length > 0) {
    console.log(`\nNOT READY — ${problems.length} problem(s):`);
    for (const p of problems) console.log(`  · ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nREADY. Everything checkable without spending is green.");
  console.log("Make exactly one real call, then check /verify/<hash> shows the payer as this wallet.\n");
}

main().catch((e) => {
  console.error(`preflight could not run: ${(e as Error).message}`);
  process.exitCode = 1;
});
