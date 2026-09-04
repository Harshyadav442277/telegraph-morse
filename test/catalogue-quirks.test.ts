import { describe, expect, it } from "vitest";
import { directRequest, endpointFor, shouldSeekSecondOpinion } from "../src/core/ask.js";
import { buildReceipt, isRiskField } from "../src/core/receipt.js";
import { confidenceText, receiptLine } from "../src/core/format.js";
import { parseEndpointIntents, type Miner } from "../src/core/telegraph.js";

/**
 * Two quirks measured in the live catalogue on 2026-09-02, both of which produced
 * wrong output before they were handled. The shapes below are copied from the real
 * `/api/miners` response, not invented.
 */

describe("miners that map a risk score into confidence_field (GAPS G8)", () => {
  // amanat-weather-risk and skywire-storm-alert declare `risk`; elcaro-ipi-detection
  // declares `risk_score`. 3 of the 73 active miners that declare anything at all.
  it("recognises risk-shaped field names and not confidence-shaped ones", () => {
    expect(isRiskField("risk")).toBe(true);
    expect(isRiskField("risk_score")).toBe(true);
    expect(isRiskField("threat_level")).toBe(true);
    expect(isRiskField("exploit_probability")).toBe(true);
    expect(isRiskField("capabilityIntelligence.risk")).toBe(true);
    expect(isRiskField("confidence")).toBe(false);
    expect(isRiskField("yield_quality.yield_quality_score")).toBe(false);
    expect(isRiskField(null)).toBe(false);
    // "brisk" must not match on a bare substring.
    expect(isRiskField("brisket")).toBe(false);
  });

  it("keeps the number but never calls a storm risk 'confidence'", () => {
    const r = buildReceipt(
      { miner_name: "skywire-storm-alert", intent: "STORM_ALERT", result: { risk: 0.85, summary: "Severe gusts expected." } },
      { confidence_field: "risk", label_field: "summary", reason_field: "summary" },
      2,
    );
    expect(r.confidence).toBe(0.85);
    expect(r.confidenceIsRisk).toBe(true);
    expect(confidenceText(r.confidence, r.confidenceIsRisk)).toContain("risk 85%");
    expect(confidenceText(r.confidence, r.confidenceIsRisk)).not.toContain("confidence 85%");
    expect(receiptLine(r, undefined)).toContain("risk 85%");
  });

  it("does not let a calm forecast masquerade as an unsure miner", () => {
    // risk 0.05 is a *good* forecast. Read as confidence it would look like 5% sure
    // and fire a second opinion on every quiet day.
    const calm = buildReceipt(
      { miner_name: "amanat-weather-risk", intent: "STORM_ALERT", result: { risk: 0.05, summary: "Clear." } },
      { confidence_field: "risk" },
      1,
    );
    expect(calm.confidenceIsRisk).toBe(true);
    expect(shouldSeekSecondOpinion(calm)).toBe(false);
  });

  it("still treats a real confidence normally", () => {
    const r = buildReceipt(
      { miner_name: "livecert", intent: "SSL_VERIFICATION", result: { confidence: 0.2, verdict: "unclear" } },
      { confidence_field: "confidence" },
      1,
    );
    expect(r.confidenceIsRisk).toBe(false);
    expect(shouldSeekSecondOpinion(r)).toBe(true);
    expect(confidenceText(r.confidence, r.confidenceIsRisk)).toBe("confidence 20%");
  });
});

describe("choosing the endpoint that serves the intent (GAPS G14)", () => {
  // Trimmed from degenlens-onchain, which publishes 33 endpoints. Descriptions open
  // with the intent name, and endpoints[0] is not the one you usually want.
  const degenlens: Miner = {
    id: "1",
    slug: "degenlens-onchain",
    supported_intents: ["ONCHAIN_TX_LOOKUP", "WALLET_BALANCE_CHECK", "FRAUD_DETECTION"],
    input_schema: { properties: { address: {}, query: {} } },
    endpoints: [
      { path: "/transaction/lookup", method: "GET", description: "ONCHAIN_TX_LOOKUP. Look up one specific EVM transaction…" },
      { path: "/wallet/balance", method: "GET", description: "WALLET_BALANCE_CHECK. Return the current native-coin and token balances…" },
      { path: "/anomaly/check", method: "GET", description: "FRAUD_DETECTION. Assess how likely the specific entity…" },
      { path: "/", method: "GET", description: "Product and catalog endpoint, NOT an intent target: do not route ONCHAIN_TX_LOOKUP, WALLET_BALANCE_CHECK or FRAUD_DETECTION here." },
    ],
  };

  it("picks the endpoint whose description names the intent", () => {
    expect(endpointFor(degenlens, "FRAUD_DETECTION")?.path).toBe("/anomaly/check");
    expect(endpointFor(degenlens, "WALLET_BALANCE_CHECK")?.path).toBe("/wallet/balance");
    expect(endpointFor(degenlens, "ONCHAIN_TX_LOOKUP")?.path).toBe("/transaction/lookup");
  });

  it("falls back to the first endpoint for an unknown or absent intent", () => {
    expect(endpointFor(degenlens, "WEATHER_CHECK")?.path).toBe("/transaction/lookup");
    expect(endpointFor(degenlens, null)?.path).toBe("/transaction/lookup");
    expect(endpointFor({ id: "2", slug: "empty" }, "ANY")).toBeUndefined();
  });

  // livecert's descriptions never name the intent, so every direct call went to
  // endpoints[0], /ssl-check, and answered "no hostname was supplied" to weather and
  // paper questions (GAPS G30). The manifest declares the mapping the catalogue drops.
  const livecert: Miner = {
    id: "4433",
    slug: "livecert",
    supported_intents: ["SSL_VERIFICATION", "STORM_ALERT", "ACADEMIC_SEARCH", "WEATHER_FORECAST", "WEATHER_CHECK"],
    input_schema: { properties: { domain: {}, topic: {}, location: {}, query: {} } },
    endpoints: [
      { path: "/ssl-check", method: "GET", description: "Live TLS handshake…" },
      { path: "/storm-alert", method: "GET", description: "Severe-weather risk…" },
      { path: "/papers", method: "GET", description: "Peer-reviewed papers via OpenAlex…" },
      { path: "/weather-forecast", method: "GET", description: "Current and future conditions…" },
    ],
  };
  const manifest = [
    "endpoints:",
    "  - path: /ssl-check",
    "    method: GET",
    "    intents: [SSL_VERIFICATION]",
    "    params:",
    "      query:",
    "        required:",
    "          - name: domain",
    '            intents: ["*"]',
    "  - path: /storm-alert",
    "    intents: [STORM_ALERT]",
    "  - path: /papers",
    "    intents:",
    "      - ACADEMIC_SEARCH",
    "    description: papers",
    "  - path: /weather-forecast   # two intents, one endpoint",
    "    intents: [WEATHER_FORECAST, WEATHER_CHECK]",
  ].join("\n");

  it("reads endpoint → intents from the manifest, flow and block forms, ignoring param scopes", () => {
    expect(parseEndpointIntents(manifest)).toEqual({
      "/ssl-check": ["SSL_VERIFICATION"],
      "/storm-alert": ["STORM_ALERT"],
      "/papers": ["ACADEMIC_SEARCH"],
      "/weather-forecast": ["WEATHER_FORECAST", "WEATHER_CHECK"],
    });
  });

  it("prefers the manifest's mapping over a description guess, and still falls back without it", () => {
    expect(endpointFor(livecert, "WEATHER_CHECK")?.path).toBe("/ssl-check");
    const informed = { ...livecert, endpoint_intents: parseEndpointIntents(manifest) };
    expect(endpointFor(informed, "WEATHER_CHECK")?.path).toBe("/weather-forecast");
    expect(endpointFor(informed, "ACADEMIC_SEARCH")?.path).toBe("/papers");
    expect(endpointFor(informed, "STORM_ALERT")?.path).toBe("/storm-alert");
    expect(endpointFor(informed, "SSL_VERIFICATION")?.path).toBe("/ssl-check");
    expect(directRequest(informed, "papers on protein folding?", "ACADEMIC_SEARCH").endpoint).toBe("/papers");
    expect(endpointFor(informed, "CRYPTO_PRICE")?.path).toBe("/ssl-check");
  });

  it("builds the direct request against the right endpoint", () => {
    const req = directRequest(degenlens, "is 0xabc a scam?", "FRAUD_DETECTION");
    expect(req.endpoint).toBe("/anomaly/check");
    expect(req.method).toBe("GET");
    expect(req.payload["query"]).toBe("is 0xabc a scam?");
    // `address` is declared but is not a question key, so it is left unset rather
    // than stuffed with prose.
    expect(req.payload["address"]).toBeUndefined();
  });

  it("uses POST when that is what the chosen endpoint declares", () => {
    const amanat: Miner = {
      id: "3",
      slug: "amanat-weather-risk",
      input_schema: { properties: { hours: {}, lat: {}, lon: {}, query: {} } },
      endpoints: [{ path: "/forecast", method: "POST", description: "Weather and storm-risk forecast. Takes lat/lon or a plain-language question." }],
    };
    const req = directRequest(amanat, "storm risk in Chennai?", "STORM_ALERT");
    expect(req).toEqual({ method: "POST", endpoint: "/forecast", payload: { query: "storm risk in Chennai?" } });
  });
});
