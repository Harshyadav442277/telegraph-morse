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
  /** "ask" for free text, or the recipe name, or "second-opinion". */
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
  /** This identity's newest answered call that named an intent, for "/second". */
  lastAnswerFor(userHash: string): Promise<CallRow | null>;
  /** One call by signal hash or by a unique prefix of one (Telegram callback data is capped at 64 bytes). */
  answerByHashPrefix(prefix: string): Promise<CallRow | null>;
  stats(): Promise<Stats>;
  insertApiKey(row: ApiKeyRow): Promise<void>;
  findApiKey(keyHash: string): Promise<ApiKeyRow | null>;
  keysIssuedToday(issuerHash: string): Promise<number>;
}

export function utcDayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
