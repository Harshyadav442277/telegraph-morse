import type { Config } from "../config.js";
import { paidWorkEnabled } from "../config.js";
import type { Channel, Ledger } from "./ledger/types.js";

/**
 * Everything that can spend goes through here first (ARCHITECTURE A7).
 * Limits are counted from the ledger so they survive serverless restarts.
 */
export interface GuardDecision {
  allowed: boolean;
  reason?: string;
  /** Calls this identity may still make today, after this one. */
  remaining: number;
}

export function perIdentityCap(c: Config, channel: Channel, keyCap?: number): number {
  switch (channel) {
    case "telegram":
      return c.PER_TELEGRAM_USER_DAILY;
    case "web":
      return c.PER_WEB_SESSION_DAILY;
    case "mcp":
    case "rest":
      return keyCap ?? c.PER_API_KEY_DAILY;
  }
}

export async function guardPaid(
  c: Config,
  ledger: Ledger,
  channel: Channel,
  userHash: string,
  wanted: number,
  keyCap?: number,
): Promise<GuardDecision> {
  if (!paidWorkEnabled(c)) {
    return {
      allowed: false,
      remaining: 0,
      reason: c.KILL_SWITCH
        ? "Morse is paused by the operator."
        : "Morse has no funded wallet or no daily budget yet, so it cannot ask the network.",
    };
  }
  const [mine, all] = await Promise.all([ledger.userCallsToday(userHash), ledger.callsToday()]);
  const cap = perIdentityCap(c, channel, keyCap);
  const remainingMine = Math.max(0, cap - mine);
  if (wanted > remainingMine) {
    return {
      allowed: false,
      remaining: remainingMine,
      reason: `Daily limit reached (${cap} calls per ${channel === "telegram" ? "user" : channel === "web" ? "session" : "key"}). Resets at 00:00 UTC.`,
    };
  }
  const remainingAll = Math.max(0, c.DAILY_BUDGET_CALLS - all);
  if (wanted > remainingAll) {
    return {
      allowed: false,
      remaining: remainingMine,
      reason: "Morse has spent today's network budget. It resets at 00:00 UTC.",
    };
  }
  return { allowed: true, remaining: remainingMine - wanted };
}
