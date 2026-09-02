import { z } from "zod";

/**
 * Environment, parsed once. Every spending knob defaults to OFF so a deployment
 * without a deliberate budget cannot spend anything (ARCHITECTURE A7).
 */
const schema = z.object({
  EVM_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
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
  /** Confidence below which a second opinion is fetched automatically. */
  SECOND_OPINION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  ASK_TIMEOUT_MS: z.coerce.number().int().min(1000).default(45_000),
});

export type Config = z.infer<typeof schema>;

let cached: Config | null = null;

export function config(): Config {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test seam. */
export function resetConfigForTests(): void {
  cached = null;
}

/** True when paid work is possible at all: key present, budget above zero, switch off. */
export function paidWorkEnabled(c: Config = config()): boolean {
  return Boolean(c.EVM_PRIVATE_KEY) && c.DAILY_BUDGET_CALLS > 0 && !c.KILL_SWITCH;
}
