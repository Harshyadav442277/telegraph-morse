import { DIAMOND } from "./telegraph.js";

/**
 * Where Morse's payments settle. Telegraph V1 settled on Base Sepolia; V2 settles on
 * Ethereum Sepolia (GAPS G39). The ledger keeps rows from both, so every explorer link
 * and the /proof page pick the chain by when the call was made.
 */
export interface Chain {
  name: string;
  explorer: string;
  blockscout: string;
  diamond: string;
}

export const ETH_SEPOLIA: Chain = {
  name: "Ethereum Sepolia",
  explorer: "https://sepolia.etherscan.io",
  blockscout: "https://eth-sepolia.blockscout.com",
  diamond: DIAMOND,
};

export const BASE_SEPOLIA: Chain = {
  name: "Base Sepolia",
  explorer: "https://sepolia.basescan.org",
  blockscout: "https://base-sepolia.blockscout.com",
  diamond: "0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8",
};

/**
 * Calls before this settled on Base Sepolia. Morse's last Base settlement is
 * 2026-10-27 18:35:20 UTC and its next call came after the V2 cutover, so any instant
 * between the two splits the ledger correctly.
 */
export const V2_FROM = Date.parse("2026-10-27T19:00:00Z");

export const CHAINS: readonly Chain[] = [ETH_SEPOLIA, BASE_SEPOLIA];

/** The chain a call made at `at` settled on; a call with no time is a new one. */
export function chainAt(at?: string | null): Chain {
  return at && Date.parse(at) < V2_FROM ? BASE_SEPOLIA : ETH_SEPOLIA;
}

export const txUrl = (hash: string, at?: string | null) => `${chainAt(at).explorer}/tx/${hash}`;
export const addressUrl = (address: string, chain: Chain = ETH_SEPOLIA) => `${chain.explorer}/address/${address}`;
