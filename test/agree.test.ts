import { describe, expect, it } from "vitest";
import { agreement, comparisonKind, numberOf, polarityOf } from "../src/core/agree.js";

const m = (minerSlug: string, minerRank: number | null, label: string | null, answer: string | null) => ({ minerSlug, minerRank, label, answer });

describe("verdict comparison", () => {
  it("reads the miner's label before its prose, and negations first", () => {
    expect(polarityOf("SSL_VERIFICATION", m("a", 1, "valid", "The certificate is not valid"))).toBe("positive");
    expect(polarityOf("SSL_VERIFICATION", m("a", 1, null, "The certificate is not valid: expired 3 days ago"))).toBe("negative");
    expect(polarityOf("SSL_VERIFICATION", m("a", 1, null, "Certificate for github.com is valid, issued by Sectigo"))).toBe("positive");
    expect(polarityOf("URL_SCAN", m("a", 1, "malicious", null))).toBe("negative");
    expect(polarityOf("FACT_CHECK", m("a", 1, null, "This claim is false. The tower is in Paris."))).toBe("negative");
    expect(polarityOf("AI_TEXT_DETECTION", m("a", 1, "human", null))).toBe("positive");
    expect(polarityOf("SSL_VERIFICATION", m("a", 1, null, "Unable to determine anything"))).toBeNull();
  });

  it("reports agreement only when at least two verdicts are clear", () => {
    const three = agreement("SSL_VERIFICATION", [
      m("txlens", 1, "valid", "Valid, issued by Sectigo."),
      m("livecert", 2, "valid", "The certificate is valid."),
      m("preflight", 3, null, "Chain trusted, hostname matches, valid for 88 days."),
    ]);
    expect(three.verdict).toBe("agree");
    expect(three.comparable).toBe(3);
    expect(three.summary).toMatch(/3 of 3 miners agree: valid/);

    const split = agreement("URL_SCAN", [m("a", 1, "safe", null), m("b", 2, "malicious", null)]);
    expect(split.verdict).toBe("disagree");
    expect(split.summary).toMatch(/Disagreement: a \(#1\) say safe; b \(#2\) say unsafe/);

    const one = agreement("URL_SCAN", [m("a", 1, "safe", null), m("b", 2, null, "Scan queued, results pending")]);
    expect(one.verdict).toBe("undetermined");
    expect(one.summary).toMatch(/Only 1 of 2/);
  });
});

describe("number comparison", () => {
  it("extracts prices, temperatures and balances", () => {
    expect(numberOf("CRYPTO_PRICE", m("a", 1, null, "Bitcoin is trading at $109,432.55 right now"))).toBe(109432.55);
    expect(numberOf("CRYPTO_PRICE", m("a", 1, "109500 USD", null))).toBe(109500);
    expect(numberOf("WEATHER_CHECK", m("a", 1, null, "Chennai: 31 °C, humid, light wind"))).toBe(31);
    expect(numberOf("WEATHER_CHECK", m("a", 1, null, "It is 30.5 degrees Celsius in Chennai"))).toBe(30.5);
    expect(numberOf("WALLET_BALANCE_CHECK", m("a", 1, null, "vitalik.eth holds 4.2311 ETH on Base"))).toBe(4.2311);
    expect(numberOf("TVL_LOOKUP", m("a", 1, null, "Aave TVL is $21.4B across chains"))).toBe(21.4e9);
    expect(numberOf("CRYPTO_PRICE", m("a", 1, null, "I could not fetch the price"))).toBeNull();
  });

  it("applies the intent's tolerance and states the range", () => {
    const close = agreement("CRYPTO_PRICE", [m("a", 1, null, "BTC: $100,000"), m("b", 2, null, "$101,500 per BTC"), m("c", 3, null, "price is $100,900")]);
    expect(close.verdict).toBe("agree");
    expect(close.summary).toMatch(/agree within 2%: 100,000 USD to 101,500 USD/);

    const far = agreement("CRYPTO_PRICE", [m("a", 1, null, "BTC: $100,000"), m("b", 2, null, "$120,000")]);
    expect(far.verdict).toBe("disagree");
    expect(far.summary).toMatch(/outside the 2% tolerance/);

    const temps = agreement("WEATHER_CHECK", [m("a", 1, null, "31 °C"), m("b", 2, null, "32.5°C and humid")]);
    expect(temps.verdict).toBe("agree");
    expect(temps.summary).toMatch(/within 2 °C/);
  });

  it("never claims agreement for free-text intents or a single answer", () => {
    expect(comparisonKind("CHAT_COMPLETION")).toBe("none");
    const chat = agreement("CHAT_COMPLETION", [m("a", 1, null, "Leonardo da Vinci"), m("b", 2, null, "Leonardo da Vinci painted it")]);
    expect(chat.verdict).toBe("undetermined");
    expect(chat.summary).toMatch(/not judged automatically/);
    const single = agreement("CRYPTO_PRICE", [m("a", 1, null, "$100,000")]);
    expect(single.verdict).toBe("undetermined");
  });
});
