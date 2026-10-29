import { describe, expect, it } from "vitest";
import { endpointFor } from "../src/core/ask.js";
import { BASE_SEPOLIA, chainAt, ETH_SEPOLIA, txUrl } from "../src/core/chains.js";
import { familyOf } from "../src/core/telegraph.js";

// Prefixes as getPrefixes() returned them on 2026-10-29 (subset), and the live intents they own.
const PREFIXES = ["WEATHER_FORECAST", "WEATHER_FORECAST_VERIFY", "STOCK_PRICE", "SSL_VERIFICATION", "FX_NOW", "CHAT_COMPLETION", "CHATBOT_CONVERSATION"];

describe("V2 intent families (G39)", () => {
  it("files each intent under its longest registered prefix", () => {
    expect(familyOf("SSL_VERIFICATION_CERT", PREFIXES)).toBe("SSL_VERIFICATION");
    expect(familyOf("STOCK_PRICE_US_EQUITY", PREFIXES)).toBe("STOCK_PRICE");
    expect(familyOf("FX_NOW_EUR", PREFIXES)).toBe("FX_NOW");
    expect(familyOf("WEATHER_FORECAST_GENERAL", PREFIXES)).toBe("WEATHER_FORECAST");
    expect(familyOf("WEATHER_FORECAST_VERIFY_GENERAL", PREFIXES)).toBe("WEATHER_FORECAST_VERIFY");
    expect(familyOf("CHATBOT_CONVERSATION_GENERAL", PREFIXES)).toBe("CHATBOT_CONVERSATION");
  });

  it("falls back to the last word when the prefix list could not be read", () => {
    expect(familyOf("CRYPTO_PRICE_USD", [])).toBe("CRYPTO_PRICE");
    expect(familyOf("PLAIN", [])).toBe("PLAIN");
  });
});

describe("endpointFor under V2", () => {
  it("finds the endpoint a V1-era manifest declared for the V2 intent's family", () => {
    // livecert's manifest, read 2026-10-29, still names V1 intents per endpoint.
    const miner = {
      id: "4433",
      slug: "livecert",
      endpoints: [{ path: "/ssl-check", method: "GET" }, { path: "/crypto-price", method: "GET" }, { path: "/weather-forecast", method: "GET" }],
      endpoint_intents: { "/ssl-check": ["SSL_VERIFICATION"], "/crypto-price": ["CRYPTO_PRICE"], "/weather-forecast": ["WEATHER_FORECAST", "WEATHER_CHECK"] },
    };
    expect(endpointFor(miner, "CRYPTO_PRICE_USD")?.path).toBe("/crypto-price");
    expect(endpointFor(miner, "WEATHER_CHECK_TEMPERATURE")?.path).toBe("/weather-forecast");
    expect(endpointFor(miner, "SSL_VERIFICATION_CERT")?.path).toBe("/ssl-check");
  });
});

describe("which chain a settlement is on", () => {
  it("puts calls before the V2 cutover on Base Sepolia and later or new ones on Ethereum Sepolia", () => {
    expect(chainAt("2026-10-27T18:35:20.692Z")).toBe(BASE_SEPOLIA);
    expect(chainAt("2026-10-30T09:00:00Z")).toBe(ETH_SEPOLIA);
    expect(chainAt(undefined)).toBe(ETH_SEPOLIA);
    expect(txUrl("0xabc", "2026-09-05T12:00:00Z")).toBe("https://sepolia.basescan.org/tx/0xabc");
    expect(txUrl("0xabc")).toBe("https://sepolia.etherscan.io/tx/0xabc");
  });
});
