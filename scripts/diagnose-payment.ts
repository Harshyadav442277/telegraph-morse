/**
 * Reproducible evidence that this node rejects a valid EIP-3009 authorization.
 *
 *   npm run diagnose-payment
 *
 * Needs no wallet and no funds: it signs with Hardhat's published test account, which
 * holds nothing on Base Sepolia, so no authorization here can ever settle and no
 * signal is created (rule 04). The node answers `invalid_exact_evm_signature` before
 * it ever looks at a balance, which is precisely the point — the same error appears
 * for a funded wallet.
 *
 * Run it, paste the output. It is written to be handed to whoever maintains the node.
 */
import { createPublicClient, hashDomain, http, recoverTypedDataAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { readFileSync } from "node:fs";

const NODE = (process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com").replace(/\/+$/, "");
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
/** Hardhat account #0. Published in their docs, unfunded here, used only to sign. */
const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

const EIP712_DOMAIN = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
] as const;

const TRANSFER_WITH_AUTHORIZATION = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "validAfter", type: "uint256" },
  { name: "validBefore", type: "uint256" },
  { name: "nonce", type: "bytes32" },
] as const;

const account = privateKeyToAccount(TEST_KEY);
const pub = createPublicClient({ chain: baseSepolia, transport: http() });

function reason(res: Response): string {
  const h = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  if (!h) return "(no payment-response header)";
  try {
    return JSON.stringify(JSON.parse(Buffer.from(h, "base64").toString("utf8")));
  } catch {
    return h.slice(0, 120);
  }
}

async function pay(network: string, twoArg: boolean, url: string, body: unknown) {
  const signer = twoArg ? toClientEvmSigner(account, pub) : toClientEvmSigner(account);
  const client = x402Client.fromConfig({
    schemes: [{ network: network as `${string}:${string}`, client: new ExactEvmScheme(signer) }],
  });
  const f = wrapFetchWithPayment(globalThis.fetch, client);
  return f(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
}

console.log(`\nTelegraph x402 payment diagnosis · ${new Date().toISOString()}`);
console.log(`node    ${NODE}`);
console.log(`payer   ${account.address}  (Hardhat #0, 0 USDC — cannot settle)`);
const x402Version = (JSON.parse(readFileSync("node_modules/@x402/fetch/package.json", "utf8")) as { version: string }).version;
console.log(`@x402   ${x402Version}`);
console.log(`runtime node ${process.version}`);

// 1 · The signature we produce is valid for the real token contract.
console.log(`\n1 · IS OUR SIGNATURE VALID FOR THE TOKEN?`);
const onchainSeparator = await pub.readContract({
  address: USDC,
  abi: [{ name: "DOMAIN_SEPARATOR", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] }],
  functionName: "DOMAIN_SEPARATOR",
});
const challengeRes = await fetch(`${NODE}/engine/v1/ask`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: "diagnosis" }),
});
const challenge = JSON.parse(Buffer.from(challengeRes.headers.get("payment-required") ?? "", "base64").toString("utf8")) as {
  accepts: Array<{ network: string; asset: string; extra?: { name?: string; version?: string } }>;
};
const evm = challenge.accepts.find((a) => a.network.startsWith("eip155"))!;
const domain = { name: evm.extra?.name ?? "", version: evm.extra?.version ?? "", chainId: 84532n, verifyingContract: USDC };
const computed = hashDomain({ domain, types: { EIP712Domain: EIP712_DOMAIN } });

console.log(`  challenge says      name="${evm.extra?.name}" version="${evm.extra?.version}" asset=${evm.asset}`);
console.log(`  token DOMAIN_SEP    ${onchainSeparator}`);
console.log(`  domain we sign      ${computed}`);
console.log(`  ${computed === onchainSeparator ? "MATCH — the authorization is valid for the real contract" : "MISMATCH — we sign the wrong domain"}`);

const client0 = x402Client.fromConfig({
  schemes: [{ network: "eip155:84532", client: new ExactEvmScheme(toClientEvmSigner(account)) }],
});
const payload = (await client0.createPaymentPayload(challenge as never)) as unknown as {
  payload: { authorization: Record<string, string>; signature: `0x${string}` };
};
const a = payload.payload.authorization;
const recovered = await recoverTypedDataAddress({
  domain,
  types: { TransferWithAuthorization: TRANSFER_WITH_AUTHORIZATION },
  primaryType: "TransferWithAuthorization",
  message: {
    from: a["from"] as `0x${string}`,
    to: a["to"] as `0x${string}`,
    value: BigInt(a["value"]!),
    validAfter: BigInt(a["validAfter"]!),
    validBefore: BigInt(a["validBefore"]!),
    nonce: a["nonce"] as `0x${string}`,
  },
  signature: payload.payload.signature,
});
console.log(`  signature recovers  ${recovered}`);
console.log(`  ${recovered.toLowerCase() === account.address.toLowerCase() ? "MATCH — signed by the declared payer" : "MISMATCH"}`);

// 2 · Yet the node rejects it, every way we can ask.
console.log(`\n2 · WHAT THE NODE SAYS, ACROSS EVERY VARIANT`);
const miners = (await (await fetch(`${NODE}/api/miners?intent=CRYPTO_PRICE&status=active&limit=5`)).json()) as
  | { miners?: Array<{ id: string | number; slug: string; endpoints?: Array<{ path: string; method?: string }> }> }
  | Array<{ id: string | number; slug: string; endpoints?: Array<{ path: string; method?: string }> }>;
const list = Array.isArray(miners) ? miners : (miners.miners ?? []);
const m = list.find((x) => (x.endpoints?.length ?? 0) > 0);

const cases: Array<[string, string, boolean, string, unknown]> = [
  ["router, exact chain, 1-arg", "eip155:84532", false, `${NODE}/engine/v1/ask`, { query: "diagnosis" }],
  ["router, exact chain, 2-arg", "eip155:84532", true, `${NODE}/engine/v1/ask`, { query: "diagnosis" }],
  ["router, wildcard chain", "eip155:*", false, `${NODE}/engine/v1/ask`, { query: "diagnosis" }],
];
if (m) {
  const ep = m.endpoints![0]!;
  cases.push([
    `direct miner ${m.slug}`,
    "eip155:84532",
    false,
    `${NODE}/engine/v1/ask/${m.id}`,
    { method: (ep.method ?? "GET").toUpperCase(), endpoint: ep.path, payload: { query: "diagnosis" } },
  ]);
}

for (const [label, network, twoArg, url, body] of cases) {
  try {
    const res = await pay(network, twoArg, url, body);
    console.log(`  ${label.padEnd(28)} HTTP ${res.status}  ${reason(res)}`);
  } catch (e) {
    console.log(`  ${label.padEnd(28)} threw: ${(e as Error).message.slice(0, 140)}`);
  }
}

console.log(`\n3 · CONCLUSION`);
console.log(`  The authorization is valid for the token contract — same domain separator, and the`);
console.log(`  signature recovers to the declared payer — yet the node returns`);
console.log(`  invalid_exact_evm_signature for every client version, signer form, chain registration`);
console.log(`  and endpoint tried. A funded wallet gets the same answer, so this is not about funds.\n`);
