import { z } from "zod";

/**
 * Environment, parsed once. Every spending knob defaults to OFF so a deployment
 * without a deliberate budget cannot spend anything (ARCHITECTURE A7).
 */
const HEX64 = /^0x[0-9a-fA-F]{64}$/;

/**
 * MetaMask exports a private key as 64 bare hex characters, with no `0x`. Accept that
 * form, and stray whitespace from a copy-paste, rather than rejecting a key that is
 * perfectly valid.
 */
export function normalisePrivateKey(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  const withPrefix = /^0x/i.test(t) ? `0x${t.slice(2)}` : `0x${t}`;
  return HEX64.test(withPrefix) ? withPrefix.toLowerCase() : undefined;
}

const schema = z.object({
  EVM_PRIVATE_KEY: z.string().regex(HEX64, "must be 64 hex characters, with or without a 0x prefix").optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(10).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
  DATABASE_URL: z.string().url().optional(),
  ADMIN_TOKEN: z.string().min(16).optional(),
  HASH_SALT: z.string().min(8).default("morse-dev-salt-change-me"),
  DAILY_BUDGET_CALLS: z.coerce.number().int().min(0).default(0),
  PER_TELEGRAM_USER_DAILY: z.coerce.number().int().min(0).default(40),
  PER_WEB_SESSION_DAILY: z.coerce.number().int().min(0).default(20),
  PER_API_KEY_DAILY: z.coerce.number().int().min(0).default(100),
  KILL_SWITCH: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  TELEGRAPH_NODE: z.string().url().default("https://devnode.telegraphprotocol.com"),
  MORSE_PUBLIC_URL: z.string().url().optional(),
  /** Bot username without the @, e.g. "morse_telegraph_bot". Renders the t.me link. */
  TELEGRAM_BOT_USERNAME: z
    .string()
    .regex(/^@?[A-Za-z0-9_]{5,32}$/)
    .transform((v) => v.replace(/^@/, ""))
    .optional(),
  ASK_TIMEOUT_MS: z.coerce.number().int().min(1000).default(45_000),
  /**
   * Try Telegraph's own router first. It was unusable on 2026-09-02 (settlement timing
   * out at ~47s) and healthy again on 2026-09-03 at 6.5s, so Morse uses it when it
   * works and falls back to its own routing when it does not (GAPS G17).
   */
  USE_ENGINE_ROUTER: z
    .string()
    .default("true")
    .transform((v) => v !== "false" && v !== "0"),
  /**
   * Hard cap on the router attempt. The failure mode is *slow*: 47s to fail plus a
   * fallback call would exceed the 60s function ceiling, so the router gets a short
   * budget and the fallback keeps the rest.
   */
  ROUTER_TIMEOUT_MS: z.coerce.number().int().min(1000).default(20_000),
});

export type Config = z.infer<typeof schema>;

let cached: Config | null = null;
let problems: string[] = [];

/**
 * Non-fatal environment problems, surfaced by /api/health. A malformed payer key
 * must not take the whole site down: the ledger, the docs and the free endpoints
 * stay up and asking fails honestly, which is the same contract as an unfunded
 * wallet (ARCHITECTURE A10).
 */
export function configProblems(): string[] {
  config();
  return problems;
}

export function config(): Config {
  if (cached) return cached;
  const env: Record<string, unknown> = { ...process.env };
  const found: string[] = [];

  if (env["EVM_PRIVATE_KEY"] !== undefined) {
    const key = normalisePrivateKey(String(env["EVM_PRIVATE_KEY"]));
    if (key) env["EVM_PRIVATE_KEY"] = key;
    else {
      delete env["EVM_PRIVATE_KEY"];
      found.push("EVM_PRIVATE_KEY is set but is not 64 hex characters — paid work is disabled until it is fixed");
    }
  }

  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`invalid environment: ${issues}`);
  }
  cached = parsed.data;
  problems = found;
  return cached;
}

/** Test seam. */
export function resetConfigForTests(): void {
  cached = null;
  problems = [];
}

/** True when paid work is possible at all: key present, budget above zero, switch off. */
export function paidWorkEnabled(c: Config = config()): boolean {
  return Boolean(c.EVM_PRIVATE_KEY) && c.DAILY_BUDGET_CALLS > 0 && !c.KILL_SWITCH;
}
