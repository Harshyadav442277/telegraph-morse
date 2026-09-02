import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { guardPaid } from "./guards.js";
import { getLedger } from "./ledger/index.js";
import type { CallRow, Channel } from "./ledger/types.js";
import { buildReceipt, type Receipt } from "./receipt.js";
import { ask, askMiner, leaderboard, minerBySlug, rankOf, TelegraphError, type Miner, type MinerEndpoint } from "./telegraph.js";

/**
 * The one path every channel uses to ask the network. Guards first, then the paid
 * call, then the ledger row — whatever happened (ARCHITECTURE A6, A7).
 */
export interface AskContext {
  channel: Channel;
  userHash: string;
  /** Per-key cap for mcp/rest identities. */
  keyCap?: number;
}

export interface AnswerCard {
  ok: boolean;
  kind: string;
  question: string;
  receipt: Receipt | null;
  /** Second opinion from the next-ranked miner, when fetched. */
  second: Receipt | null;
  error: string | null;
  /** Calls this identity may still make today. */
  remaining: number | null;
  rowId: string | null;
}

export function preview(q: string): string {
  const s = q.replace(/\s+/g, " ").trim();
  return s.length > 200 ? `${s.slice(0, 197)}…` : s;
}

/** Guard for N calls without spending; recipes call this before fanning out. */
export async function guard(ctx: AskContext, wanted: number) {
  return guardPaid(config(), getLedger(), ctx.channel, ctx.userHash, wanted, ctx.keyCap);
}

export async function askNetwork(ctx: AskContext, question: string, kind = "ask", skipGuard = false): Promise<AnswerCard> {
  const ledger = getLedger();
  await ledger.touchUser(ctx.userHash, ctx.channel);
  let remaining: number | null = null;
  if (!skipGuard) {
    const g = await guard(ctx, 1);
    remaining = g.remaining;
    if (!g.allowed) {
      return { ok: false, kind, question, receipt: null, second: null, error: g.reason ?? "Not allowed.", remaining, rowId: null };
    }
  }
  const row = baseRow(ctx, kind, question);
  try {
    const raw = await ask(question);
    const miner = await minerBySlug(raw.miner_name);
    const receipt = buildReceipt(raw, miner?.signal_mapping ?? null, rankOf(miner, raw.intent ?? null));
    fillRow(row, receipt, "ok");
    await ledger.recordCall(row);
    return { ok: true, kind, question, receipt, second: null, error: null, remaining, rowId: row.id };
  } catch (e) {
    const err = e instanceof TelegraphError ? e : new TelegraphError((e as Error).message, "network");
    row.status = err.kind === "timeout" ? "timeout" : err.kind === "unpaid" ? "unpaid" : "error";
    row.error = err.message.slice(0, 300);
    await ledger.recordCall(row);
    return { ok: false, kind, question, receipt: null, second: null, error: err.message, remaining, rowId: row.id };
  }
}

/**
 * Second opinion: call the next-ranked active miner for the same intent directly.
 * Payload construction is best-effort from the miner's declared input schema; a
 * miner that cannot be addressed this way fails honestly and costs nothing.
 */
export async function secondOpinion(
  ctx: AskContext,
  question: string,
  intent: string,
  excludeSlug: string | null,
): Promise<{ receipt: Receipt | null; error: string | null }> {
  const g = await guard(ctx, 1);
  if (!g.allowed) return { receipt: null, error: g.reason ?? "Not allowed." };
  const board = await leaderboard(intent);
  const candidate = board.find((e) => e.miner.slug !== excludeSlug && (e.miner.endpoints?.length ?? 0) > 0);
  if (!candidate) return { receipt: null, error: `No other active miner serves ${intent}.` };
  const req = directRequest(candidate.miner, question, intent);
  const row = baseRow(ctx, "second-opinion", question);
  const ledger = getLedger();
  try {
    const raw = await askMiner(candidate.miner.id, req);
    raw.intent = intent;
    raw.miner_name = raw.miner_name ?? candidate.miner.slug;
    const receipt = buildReceipt(raw, candidate.miner.signal_mapping ?? null, candidate.rank);
    fillRow(row, receipt, "ok");
    await ledger.recordCall(row);
    return { receipt, error: null };
  } catch (e) {
    const err = e instanceof TelegraphError ? e : new TelegraphError((e as Error).message, "network");
    row.status = err.kind === "timeout" ? "timeout" : err.kind === "unpaid" ? "unpaid" : "error";
    row.error = err.message.slice(0, 300);
    row.minerSlug = candidate.miner.slug;
    row.minerId = candidate.miner.id;
    row.intent = intent;
    await ledger.recordCall(row);
    return { receipt: null, error: `${candidate.miner.slug} could not answer directly: ${err.message}` };
  }
}

export interface SecondOpinionResult {
  first: CallRow | null;
  second: Receipt | null;
  error: string | null;
}

/**
 * Second opinion on an answer already in the ledger, shared by every channel. The
 * question is re-asked from the row's stored preview, so a question longer than 200
 * characters is re-asked in its clipped form (GAPS G15).
 */
export async function secondOpinionOn(ctx: AskContext, row: CallRow | null): Promise<SecondOpinionResult> {
  if (!row) {
    return { first: null, second: null, error: "I have no earlier answer of yours to compare against — ask something first." };
  }
  if (!row.intent) {
    return { first: row, second: null, error: "That answer did not name an intent, so there is no leaderboard to draw a second miner from." };
  }
  const r = await secondOpinion(ctx, row.preview, row.intent, row.minerSlug);
  return { first: row, second: r.receipt, error: r.error };
}

const QUESTION_KEYS = ["query", "q", "question", "text", "prompt", "input", "message"];

/**
 * Pick the endpoint that serves `intent`. 29 of the 129 active miners publish more
 * than one endpoint (measured 2026-09-02), and they name the intent at the start of
 * each description — degenlens-onchain lists 33, of which `endpoints[0]` is
 * ONCHAIN_TX_LOOKUP, so asking it for a FRAUD_DETECTION second opinion used to hit
 * the wrong endpoint entirely. Falls back to the first endpoint (GAPS G14).
 */
export function endpointFor(miner: Miner, intent: string | null): MinerEndpoint | undefined {
  const eps = miner.endpoints ?? [];
  if (intent) {
    const named = eps.find((e) => new RegExp(`(^|[^A-Z_])${intent}([^A-Z_]|$)`).test(e.description ?? ""));
    if (named) return named;
  }
  return eps[0];
}

/** Shape a direct request from the endpoint serving this intent and the miner's declared inputs. */
export function directRequest(
  miner: Miner,
  question: string,
  intent: string | null = null,
): { method: "GET" | "POST"; endpoint: string; payload: Record<string, unknown> } {
  const ep = endpointFor(miner, intent);
  const method = (ep?.method ?? "GET").toUpperCase() === "POST" ? "POST" : "GET";
  const props = Object.keys(miner.input_schema?.properties ?? {});
  const payload: Record<string, unknown> = { query: question };
  for (const k of props) if (QUESTION_KEYS.includes(k)) payload[k] = question;
  return { method, endpoint: ep?.path ?? "/", payload };
}

export function shouldSeekSecondOpinion(receipt: Receipt): boolean {
  // A risk score is not a confidence: a low one means "safe", not "unsure", and would
  // otherwise trigger a second opinion on every calm weather report (GAPS G8).
  if (receipt.confidenceIsRisk) return false;
  return receipt.confidence !== null && receipt.confidence < config().SECOND_OPINION_THRESHOLD && Boolean(receipt.intent);
}

function baseRow(ctx: AskContext, kind: string, question: string): CallRow {
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    channel: ctx.channel,
    userHash: ctx.userHash,
    kind,
    preview: preview(question),
    intent: null,
    minerSlug: null,
    minerId: null,
    minerRank: null,
    confidence: null,
    costUsd: null,
    durationMs: null,
    signalHash: null,
    status: "error",
    error: null,
  };
}

function fillRow(row: CallRow, r: Receipt, status: CallRow["status"]): void {
  row.intent = r.intent;
  row.minerSlug = r.minerSlug;
  row.minerId = r.minerId;
  row.minerRank = r.minerRank;
  row.confidence = r.confidence;
  row.costUsd = r.costUsd;
  row.durationMs = r.durationMs;
  row.signalHash = r.signalHash;
  row.status = status;
}
