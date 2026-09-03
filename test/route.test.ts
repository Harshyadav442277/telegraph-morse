import { describe, expect, it } from "vitest";
import { classifyIntent } from "../src/core/route.js";

const intentOf = (q: string) => classifyIntent(q)?.intent ?? null;

/**
 * Morse routes for itself because Telegraph's router cannot settle inside a
 * serverless function (GAPS G17), so these rules are load-bearing.
 */
describe("intent classification", () => {
  it("does not let a URL's scheme steal a safety question", () => {
    // The first shipped rule matched `https`, so every "is this link safe" question
    // went to SSL_VERIFICATION — caught by running the safe recipe for real.
    expect(intentOf("Is the URL https://example.com safe to visit? Check it for phishing, malware and scams.")).toBe("URL_SCAN");
    expect(intentOf("is https://foo.test safe")).toBe("URL_SCAN");
  });

  it("still routes genuine certificate questions to SSL_VERIFICATION", () => {
    expect(intentOf("Is the SSL/TLS certificate for example.com currently valid, and who issued it?")).toBe("SSL_VERIFICATION");
    expect(intentOf("who issued the cert for github.com")).toBe("SSL_VERIFICATION");
  });

  it("separates the three legs of the safe recipe", () => {
    const legs = [
      "Is the URL https://example.com safe to visit? Check it for phishing, malware and scams.",
      "Is the SSL/TLS certificate for example.com currently valid, and who issued it?",
      "Where is the IP address 93.184.216.34 located, and which organisation operates it?",
    ].map(intentOf);
    expect(legs).toEqual(["URL_SCAN", "SSL_VERIFICATION", "IP_GEOLOCATION"]);
    expect(new Set(legs).size, "each leg must reach a different intent").toBe(3);
  });

  it("routes the other recipes' questions apart too", () => {
    expect(intentOf("What is the current weather in Chennai?")).toBe("WEATHER_CHECK");
    expect(intentOf("Is there a storm or severe weather risk in Chennai over the next 48 hours?")).toBe("STORM_ALERT");
    expect(intentOf("What is the current ETH balance of 0x1234567890123456789012345678901234567890 on Base?")).toBe("WALLET_BALANCE_CHECK");
    expect(intentOf("How likely is the wallet vitalik.eth to be involved in fraud, scams or illicit activity?")).toBe("FRAUD_DETECTION");
  });

  it("returns null rather than forcing a bad fit", () => {
    expect(intentOf("write me a haiku about autumn")).toBeNull();
  });
});

describe("direct request payloads", () => {
  const prose = { id: "1", slug: "chainsight-oracle", input_schema: { properties: { query: {}, address: {}, symbol: {} } }, endpoints: [{ path: "/p", method: "GET", description: "STORM_ALERT." }] };
  const typed = { id: "2", slug: "openweathermap", input_schema: { properties: { lat: {}, lon: {}, q: {} } }, endpoints: [{ path: "/weather", method: "GET", description: "WEATHER_CHECK." }] };

  it("uses prose when the miner takes prose, and leaves typed keys alone", async () => {
    const { directRequest } = await import("../src/core/ask.js");
    const req = directRequest(prose, "storm risk in Chennai?", "STORM_ALERT", "Chennai");
    expect(req.payload["query"]).toBe("storm risk in Chennai?");
    // Passing a place name as an address or a ticker is how the node was made to
    // predict failure. It must not happen again.
    expect(req.payload["address"]).toBeUndefined();
    expect(req.payload["symbol"]).toBeUndefined();
  });

  it("falls back to the subject only when the miner takes no prose", async () => {
    const { directRequest } = await import("../src/core/ask.js");
    const req = directRequest(typed, "What is the current weather in Chennai?", "WEATHER_CHECK", "Chennai");
    expect(req.payload["q"], "openweathermap wants a city, not a sentence").toBe("Chennai");
  });

  it("leaves the subject key unset when there is no subject", async () => {
    const { directRequest } = await import("../src/core/ask.js");
    expect(directRequest(typed, "weather?", "WEATHER_CHECK").payload["q"]).toBeUndefined();
  });
});

describe("skipping miners we cannot address", () => {
  const needsModel = { id: "1", slug: "bedrock-nova-2-lite", input_schema: { properties: { messages: {}, model: {}, max_tokens: {} }, required: ["messages", "model"] }, endpoints: [{ path: "/chat", method: "POST" }] };
  const needsNothing = { id: "2", slug: "telegraph-chatbot", input_schema: { properties: {} }, endpoints: [{ path: "/chat", method: "POST" }] };
  const needsLatLon = { id: "3", slug: "amanat-weather-risk", input_schema: { properties: { lat: {}, lon: {}, question: {} }, required: ["lat", "lon"] }, endpoints: [{ path: "/forecast", method: "POST" }] };
  const needsCity = { id: "4", slug: "openweathermap", input_schema: { properties: { lat: {}, lon: {}, q: {} }, required: ["q"] }, endpoints: [{ path: "/weather", method: "GET" }] };

  it("refuses a miner that requires a model we cannot know", async () => {
    const { canAddress } = await import("../src/core/route.js");
    // 14 real failures came from routing every unmatched question to this miner.
    expect(canAddress(needsModel)).toBe(false);
    expect(canAddress(needsNothing)).toBe(true);
  });

  it("refuses a miner that requires coordinates", async () => {
    const { canAddress } = await import("../src/core/route.js");
    expect(canAddress(needsLatLon, "Chennai")).toBe(false);
  });

  it("accepts a subject-only miner when a subject exists, not otherwise", async () => {
    const { canAddress } = await import("../src/core/route.js");
    expect(canAddress(needsCity, "Chennai")).toBe(true);
    expect(canAddress(needsCity)).toBe(false);
  });

  it("builds an OpenAI-shaped messages array whenever the miner declares one", async () => {
    const { directRequest } = await import("../src/core/ask.js");
    const declared = directRequest({ ...needsModel, input_schema: { properties: { messages: {} } } } as never, "write me a haiku", "CHAT_COMPLETION");
    expect(declared.payload["messages"]).toEqual([{ role: "user", content: "write me a haiku" }]);
  });

  it("sends messages for chat-shaped intents even when the schema omits it", async () => {
    const { directRequest } = await import("../src/core/ask.js");
    // telegraph-chatbot declares an empty schema and then 422s on a missing
    // `messages` body, so the declared schema cannot be trusted here.
    const req = directRequest(needsNothing as never, "write me a haiku", "CHAT_COMPLETION");
    expect(req.payload["messages"]).toEqual([{ role: "user", content: "write me a haiku" }]);
  });

  it("does not send messages to a non-chat intent that never asked for it", async () => {
    const { directRequest } = await import("../src/core/ask.js");
    const req = directRequest(needsCity as never, "weather in Chennai?", "WEATHER_CHECK", "Chennai");
    expect(req.payload["messages"]).toBeUndefined();
  });
});
