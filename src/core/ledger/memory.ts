import type { ApiKeyRow, CallRow, Channel, Ledger, Stats } from "./types.js";
import { utcDayStart } from "./types.js";

/**
 * In-memory ledger for local development and for the offline demo. It is labelled
 * "ephemeral" everywhere it is shown and is never used when DATABASE_URL is set.
 */
export class MemoryLedger implements Ledger {
  readonly kind = "memory" as const;
  private calls: CallRow[] = [];
  private users = new Map<string, { channel: Channel; firstSeen: string; lastSeen: string }>();
  private keys = new Map<string, ApiKeyRow>();

  async init(): Promise<void> {}

  async recordCall(row: CallRow): Promise<void> {
    this.calls.push(row);
    if (this.calls.length > 5000) this.calls = this.calls.slice(-5000);
  }

  async touchUser(userHash: string, channel: Channel): Promise<void> {
    const now = new Date().toISOString();
    const u = this.users.get(userHash);
    if (u) u.lastSeen = now;
    else this.users.set(userHash, { channel, firstSeen: now, lastSeen: now });
  }

  async userCallsToday(userHash: string): Promise<number> {
    const day = utcDayStart().toISOString();
    return this.calls.filter((c) => c.userHash === userHash && c.status === "ok" && c.at >= day).length;
  }

  async callsToday(): Promise<number> {
    const day = utcDayStart().toISOString();
    return this.calls.filter((c) => c.status === "ok" && c.at >= day).length;
  }

  async recent(limit: number): Promise<CallRow[]> {
    return this.calls.slice(-limit).reverse();
  }

  async latestAnswered(): Promise<CallRow | null> {
    // The showcase row: a routed answer with substance, never an "unavailable" reply.
    return (
      [...this.calls]
        .reverse()
        .find((c) => c.status === "ok" && c.kind === "ask" && c.signalHash && (c.answer?.length ?? 0) > 40 && !/(unavailable|not available|temporarily|could not|unable to|error)/i.test(c.answer ?? "")) ?? null
    );
  }

  async stats(): Promise<Stats> {
    return computeStats(this.calls, this.users.size);
  }

  async insertApiKey(row: ApiKeyRow): Promise<void> {
    this.keys.set(row.keyHash, row);
  }

  async findApiKey(keyHash: string): Promise<ApiKeyRow | null> {
    return this.keys.get(keyHash) ?? null;
  }

  async keysIssuedToday(issuerHash: string): Promise<number> {
    const day = utcDayStart().toISOString();
    return [...this.keys.values()].filter((k) => k.issuerHash === issuerHash && k.issuedAt >= day).length;
  }
}

/** Shared by the memory ledger and by tests; Postgres computes the same shape in SQL. */
export function computeStats(calls: CallRow[], users: number): Stats {
  const ok = calls.filter((c) => c.status === "ok");
  const day = utcDayStart().toISOString();
  const today = ok.filter((c) => c.at >= day);
  const byChannel: Record<string, number> = {};
  const byIntentMap = new Map<string, number>();
  for (const c of ok) {
    byChannel[c.channel] = (byChannel[c.channel] ?? 0) + 1;
    if (c.intent) byIntentMap.set(c.intent, (byIntentMap.get(c.intent) ?? 0) + 1);
  }
  return {
    users,
    usersAnswered: new Set(ok.map((c) => c.userHash)).size,
    calls: calls.length,
    okCalls: ok.length,
    intents: byIntentMap.size,
    miners: new Set(ok.map((c) => c.minerSlug).filter(Boolean)).size,
    spentUsd: Number(ok.reduce((a, c) => a + (c.costUsd ?? 0), 0).toFixed(4)),
    byChannel,
    byIntent: [...byIntentMap.entries()]
      .map(([intent, n]) => ({ intent, calls: n }))
      .sort((a, b) => b.calls - a.calls),
    today: { calls: today.length, users: new Set(today.map((c) => c.userHash)).size },
    firstCallAt: ok[0]?.at ?? null,
    lastCallAt: ok.at(-1)?.at ?? null,
  };
}
