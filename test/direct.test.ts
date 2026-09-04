import { describe, expect, it } from "vitest";
import { intentForMiner } from "../src/core/ask.js";
import { addressedQuestion } from "../src/channels/telegram.js";
import type { Miner } from "../src/core/telegraph.js";

const weather: Miner = { id: "4433", slug: "livecert", supported_intents: ["WEATHER_FORECAST", "WEATHER_CHECK", "SSL_VERIFICATION"] };

describe("intentForMiner", () => {
  it("files the question under the classified intent when the miner serves it", () => {
    expect(intentForMiner(weather, "Is the SSL certificate for github.com valid?")).toBe("SSL_VERIFICATION");
    expect(intentForMiner(weather, "What is the weather forecast for London tomorrow?")).toBe("WEATHER_FORECAST");
  });

  it("falls back to the miner's first intent when the question matches nothing it serves", () => {
    expect(intentForMiner(weather, "Who painted the Mona Lisa?")).toBe("WEATHER_FORECAST");
    expect(intentForMiner(weather, "What is the price of BTC right now?")).toBe("WEATHER_FORECAST");
  });

  it("returns null for a miner that declares no intents", () => {
    expect(intentForMiner({ id: "1", slug: "empty" }, "anything at all")).toBeNull();
  });
});

describe("addressedQuestion (Telegram groups)", () => {
  it("answers every plain message in a private chat", () => {
    expect(addressedQuestion("  Is github.com's certificate valid?  ", { isGroup: false })).toBe("Is github.com's certificate valid?");
    expect(addressedQuestion("hi", { isGroup: false })).toBeNull();
    expect(addressedQuestion("/help", { isGroup: false })).toBeNull();
  });

  it("stays silent in a group unless mentioned or replied to", () => {
    expect(addressedQuestion("what's the weather in Pune?", { isGroup: true, botUsername: "MyMorse_Bot" })).toBeNull();
    expect(addressedQuestion("@MyMorse_Bot what's the weather in Pune?", { isGroup: true, botUsername: "MyMorse_Bot" })).toBe("what's the weather in Pune?");
    expect(addressedQuestion("weather in Pune @mymorse_bot please", { isGroup: true, botUsername: "MyMorse_Bot" })).toBe("weather in Pune please");
    expect(addressedQuestion("what's the weather in Pune?", { isGroup: true, botUsername: "MyMorse_Bot", repliedToBot: true })).toBe("what's the weather in Pune?");
  });

  it("does not treat a mention of a similarly named bot as being addressed", () => {
    expect(addressedQuestion("@MyMorse_Bot2 hello there", { isGroup: true, botUsername: "MyMorse_Bot" })).toBeNull();
    expect(addressedQuestion("@MyMorse_Bot", { isGroup: true, botUsername: "MyMorse_Bot" })).toBeNull();
  });
});
