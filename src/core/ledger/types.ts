/**
 * The ledger is the product's evidence (ARCHITECTURE A6). Every Telegraph call Morse
 * makes becomes one row here, whatever channel asked for it.
 */
export type Channel = "telegram" | "web" | "mcp" | "rest";

export type CallStatus = "ok" | "error" | "unpaid" | "timeout";

export interface CallRow {
  id: string;
  at: string; // ISO
  channel: Channel;
  userHash: string;
  /** "ask" for free text, "direct" for a named miner, or the recipe name. Historical
   * rows also carry "podium" and "second-opinion", retired on 2026-09-04. */
  kind: string;
  /** Short, non-identifying preview of what was asked (≤120 chars). */
  preview: string;
  intent: string | null;
  minerSlug: string | null;
  minerId: string | null;
  minerRank: number | null;
  confidence: number | null;
  costUsd: number | null;
  durationMs: number | null;
  signalHash: string | null;
  /** On-chain USDC settlement transaction, when the node reported one. */
  settlementTx: string | null;
  /** Which router chose the miner: Telegraph's engine, or Morse's own fallback. */
  routedBy: "engine" | "morse" | null;
  /** The miner's own verdict label, when it declares one. */
  label: string | null;
  /** The answer text Morse showed, clipped to 500 characters. */
  answer: string | null;
  /** Grouped historical rows to the answer that started them. Null on every new row. */
  groupId: string | null;
  status: CallStatus;
  error: string | null;
}

export interface Stats {
  /** Distinct salted identities that asked at least once, answered or not. */
  users: number;
  /** Distinct salted identities that received at least one answer. The stricter number. */
  usersAnswered: number;
  calls: number;
  okCalls: number;
  intents: number;
  miners: number;
  spentUsd: number;
  byChannel: Record<string, number>;
  byIntent: Array<{ intent: string; calls: number }>;
  today: { calls: number; users: number };
  firstCallAt: string | null;
  lastCallAt: string | null;
}

export interface ApiKeyRow {
  keyHash: string;
  label: string;
  dailyCap: number;
  issuedAt: string;
  issuerHash: string;
}

export interface Ledger {
  readonly kind: "postgres" | "memory";
  init(): Promise<void>;
  recordCall(row: CallRow): Promise<void>;
  touchUser(userHash: string, channel: Channel): Promise<void>;
  /** Paid calls (status ok) made by this user in the current UTC day. */
  userCallsToday(userHash: string): Promise<number>;
  /** All paid calls network-wide (ours) in the current UTC day. */
  callsToday(): Promise<number>;
  recent(limit: number): Promise<CallRow[]>;
  /** The newest answered row that stored its answer text, for the landing page's example receipt. */
  latestAnswered(): Promise<CallRow | null>;
  stats(): Promise<Stats>;
  insertApiKey(row: ApiKeyRow): Promise<void>;
  findApiKey(keyHash: string): Promise<ApiKeyRow | null>;
  keysIssuedToday(issuerHash: string): Promise<number>;
}

export function utcDayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
