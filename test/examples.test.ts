import { describe, expect, it } from "vitest";
import { EXAMPLES, GROUPS, parseSlash, QUICK } from "../src/core/examples.js";
import { classifyIntent } from "../src/core/route.js";

describe("example questions", () => {
  it("every example routes to the intent it claims through the fallback classifier", () => {
    for (const e of EXAMPLES) {
      const got = classifyIntent(e.q)?.intent ?? "CHAT_COMPLETION";
      expect(got, e.q).toBe(e.intent);
    }
  });

  it("the quick set and the groups only reference intents that have examples", () => {
    const intents = new Set(EXAMPLES.map((e) => e.intent));
    expect(QUICK).toHaveLength(8);
    for (const g of GROUPS) for (const i of g.intents) expect(intents.has(i), i).toBe(true);
  });

  it("parses slash commands typed into the web box", () => {
    expect(parseSlash("/safe https://example.com")).toEqual({ command: "safe", input: "https://example.com" });
    expect(parseSlash("/weather   Pune ")).toEqual({ command: "weather", input: "Pune" });
    expect(parseSlash("/hot")).toEqual({ command: "hot", input: "" });
    expect(parseSlash("/Fact@MyMorse_Bot the moon is cheese")).toEqual({ command: "fact", input: "the moon is cheese" });
    expect(parseSlash("what is the weather")).toBeNull();
  });
});
