import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Identifiers are never stored raw. A salted SHA-256 lets us count distinct users
 * and enforce per-user limits without keeping Telegram ids, IPs or keys in the ledger.
 */
export function hashId(kind: string, raw: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${kind}|${raw}`).digest("hex").slice(0, 32);
}

/** API keys are random, shown once, stored only as a hash. */
export function newApiKey(): { key: string; keyHash: string } {
  const key = `morse_${randomBytes(24).toString("base64url")}`;
  return { key, keyHash: hashKey(key) };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Constant-time compare for secrets. */
export function secretsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function bearer(header: string | undefined): string | undefined {
  const m = header?.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim();
}
