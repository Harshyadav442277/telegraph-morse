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
