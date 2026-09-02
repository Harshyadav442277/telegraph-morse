import { describe, expect, it } from "vitest";
import { normalisePrivateKey } from "../src/config.js";

/**
 * MetaMask's "Show private key" yields 64 bare hex characters. Rejecting that cost a
 * deployment: the whole site 500'd on a key that was perfectly valid (GAPS G20).
 */
describe("private key normalisation", () => {
  const bare = "a".repeat(64);

  it("accepts the MetaMask form, with no 0x", () => {
    expect(normalisePrivateKey(bare)).toBe(`0x${bare}`);
  });

  it("accepts the prefixed form and normalises case", () => {
    expect(normalisePrivateKey(`0x${"A".repeat(64)}`)).toBe(`0x${"a".repeat(64)}`);
    expect(normalisePrivateKey(`0X${bare}`)).toBe(`0x${bare}`);
  });

  it("tolerates copy-paste whitespace", () => {
    expect(normalisePrivateKey(`  ${bare}\n`)).toBe(`0x${bare}`);
  });

  it("rejects anything that is not 64 hex characters", () => {
    expect(normalisePrivateKey("0xdeadbeef")).toBeUndefined();
    expect(normalisePrivateKey("z".repeat(64))).toBeUndefined();
    expect(normalisePrivateKey(`${bare}ff`)).toBeUndefined();
    expect(normalisePrivateKey("")).toBeUndefined();
    expect(normalisePrivateKey(undefined)).toBeUndefined();
  });
});
