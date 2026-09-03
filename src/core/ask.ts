import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { guardPaid } from "./guards.js";
import { getLedger } from "./ledger/index.js";
import type { CallRow, Channel } from "./ledger/types.js";
import { buildReceipt, type Receipt } from "./receipt.js";
import { askMiner, askRouted, leaderboard, rankOf, resolveMiner, TelegraphError, type Miner, type MinerEndpoint } from "./telegraph.js";
import { CHAT_INTENTS, MESSAGES_KEY, PROSE_KEYS, routeCandidates, SUBJECT_KEYS, type Route } from "./route.js";

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
  /** Who chose the miner: Telegraph's own router, or Morse's fallback. */
  routedBy?: "engine" | "morse" | null;
}

export function preview(q: string): string {
  const s = q.replace(/\s+/g, " ").trim();
  return s.length > 200 ? `${s.slice(0, 197)}…` : s;
}

/** The answer text kept on the ledger row, clipped so a row stays small. */
export function answerExcerpt(a: string | null | undefined): string | null {
  if (!a) return null;
  const s = a.replace(/\s+/g, " ").trim();
  return s.length > 500 ? `${s.slice(0, 497)}…` : s;
}

/** Guard for N calls without spending; recipes call this before fanning out. */
export async function guard(ctx: AskContext, wanted: number) {
  return guardPaid(config(), getLedger(), ctx.channel, ctx.userHash, wanted, ctx.keyCap);
}

export async function askNetwork(ctx: AskContext, question: string, kind = "ask", skipGuard = false, subject?: string): Promise<AnswerCard> {
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
  let chosen: Route | null = null;
  try {
    // Telegraph's own router classifies with an LLM and is better at it than keyword
    // rules, so it goes first — on a short leash. It was unusable on 2026-09-02
    // (settlement timing out at ~47s) and healthy at 6.5s the next day, and a 60s
    // function has no room for a slow failure plus a fallback (GAPS G17).
    const cfg = config();
    if (cfg.USE_ENGINE_ROUTER && !skipGuard) {
      const viaEngine = await tryEngineRouter(question);
      if (viaEngine) {
        fillRow(row, viaEngine, "ok");
        row.routedBy = "engine";
        await ledger.recordCall(row);
        return { ok: true, kind, question, receipt: viaEngine, second: null, error: null, remaining, rowId: row.id, routedBy: "engine" };
      }
    }

    const candidates = await routeCandidates(question, subject);
    if (candidates.length === 0) {
      throw new TelegraphError("No active miner serves a question like this right now.", "engine");
    }
    let lastError: TelegraphError | null = null;
    for (const [i, cand] of candidates.entries()) {
      chosen = cand;
      try {
        const raw = await askMiner(cand.miner.id, directRequest(cand.miner, question, cand.intent, subject));
        raw.intent ??= cand.intent;
        const receipt = buildReceipt(raw, cand.miner.signal_mapping ?? null, cand.rank);
        receipt.minerSlug = cand.miner.slug;
        const after = i === 0 ? "" : ` The ${i} better-ranked miner${i > 1 ? "s" : ""} could not be paid or could not take the request.`;
        receipt.routerReasoning = `Telegraph's own router did not answer, so Morse routed this itself: ${cand.why}, then called the #${cand.rank ?? "?"} miner for ${cand.intent}.${after}`;
        fillRow(row, receipt, "ok");
        row.routedBy = "morse";
        await ledger.recordCall(row);
        return { ok: true, kind, question, receipt, second: null, error: null, remaining, rowId: row.id, routedBy: "morse" };
      } catch (inner) {
        const err = inner instanceof TelegraphError ? inner : new TelegraphError((inner as Error).message, "network");
        lastError = err;
        // Only move on when this attempt provably cost nothing: a refused payment, or
        // the node's free pre-validation. A 500 may already have been paid for, and a
        // timeout may still land, so neither is retried — that would risk paying twice.
        const freeFailure = err.kind === "unpaid" || err.status === 422;
        if (!freeFailure) throw err;
      }
    }
    throw lastError ?? new TelegraphError("No miner could take this question.", "engine");
  } catch (e) {
    const err = e instanceof TelegraphError ? e : new TelegraphError((e as Error).message, "network");
    row.status = err.kind === "timeout" ? "timeout" : err.kind === "unpaid" ? "unpaid" : "error";
    row.error = err.message.slice(0, 300);
    // Keep the routing on a failed row too. Without this every failure logged as
    // "(unrouted)" and the ledger could not tell you which intent or miner broke.
    if (chosen) {
      row.intent = chosen.intent;
      row.minerSlug = chosen.miner.slug;
      row.minerId = chosen.miner.id;
      row.minerRank = chosen.rank;
      row.routedBy = "morse";
    }
    await ledger.recordCall(row);
    return { ok: false, kind, question, receipt: null, second: null, error: err.message, remaining, rowId: row.id, routedBy: row.routedBy };
  }
}

/**
 * One capped attempt at Telegraph's router. Returns null — never throws — when it
 * cannot serve the question, because the caller's job is to fall back quietly rather
 * than surface the network's bad day to the person who asked.
 *
 * Nothing is charged for a failure here: the settle timeout that broke it reported an
 * empty `transaction`, and a 402 means the payment was refused rather than taken.
 */
async function tryEngineRouter(question: string): Promise<Receipt | null> {
  try {
    const raw = await askRouted(question);
    // The Engine names the miner by display name and by catalogue id; the slug is
    // what the ledger, the leaderboard and Podium key on, so resolve it here.
    const miner = await resolveMiner({ id: raw.miner_id ?? null, name: raw.miner_name ?? null });
    const receipt = buildReceipt(raw, miner?.signal_mapping ?? null, rankOf(miner, raw.intent ?? null));
    if (miner) receipt.minerSlug = miner.slug;
    receipt.routerReasoning = `Telegraph's own router classified this as ${raw.intent ?? "an intent"} and picked ${miner?.slug ?? raw.miner_name ?? "a miner"}${receipt.minerRank ? ` (#${receipt.minerRank})` : ""}.`;
    return receipt;
  } catch (e) {
    const err = e instanceof TelegraphError ? e : new TelegraphError((e as Error).message, "network");
    console.error(`engine router unavailable (${err.kind}), falling back to Morse routing:`, err.message.slice(0, 200));
    return null;
  }
}

export interface DirectOutcome {
  receipt: Receipt | null;
  error: string | null;
  row: CallRow;
}

/**
 * Call one named miner directly for one intent, and record the row whatever
 * happens. Shared by second opinions and Podium. The caller has already applied the
 * spending guard for this call.
 */
export async function callMinerDirect(
  ctx: AskContext,
  miner: Miner,
  rank: number | null,
  intent: string,
  question: string,
  opts: { kind: string; groupId?: string | null; timeoutMs?: number; subject?: string },
): Promise<DirectOutcome> {
  const row = baseRow(ctx, opts.kind, question);
  row.groupId = opts.groupId ?? null;
  row.routedBy = "morse";
  row.intent = intent;
  row.minerSlug = miner.slug;
  row.minerId = miner.id;
  row.minerRank = rank;
  const ledger = getLedger();
  try {
    const raw = await askMiner(miner.id, directRequest(miner, question, intent, opts.subject), opts.timeoutMs);
    raw.intent = intent;
    const receipt = buildReceipt(raw, miner.signal_mapping ?? null, rank);
    receipt.minerSlug = miner.slug;
    receipt.routerReasoning = `Morse called ${miner.slug} (#${rank ?? "?"} for ${intent}) directly, at your request.`;
    fillRow(row, receipt, "ok");
    await ledger.recordCall(row);
    return { receipt, error: null, row };
  } catch (e) {
    const err = e instanceof TelegraphError ? e : new TelegraphError((e as Error).message, "network");
    row.status = err.kind === "timeout" ? "timeout" : err.kind === "unpaid" ? "unpaid" : "error";
    row.error = err.message.slice(0, 300);
    await ledger.recordCall(row);
    return { receipt: null, error: `${miner.slug} could not answer directly: ${err.message}`, row };
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
  const candidate = board.find((e) => e.miner.slug !== excludeSlug && e.miner.name !== excludeSlug && (e.miner.endpoints?.length ?? 0) > 0);
  if (!candidate) return { receipt: null, error: `No other active miner serves ${intent}.` };
  const out = await callMinerDirect(ctx, candidate.miner, candidate.rank, intent, question, { kind: "second-opinion" });
  return { receipt: out.receipt, error: out.error };
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
  subject?: string,
): { method: "GET" | "POST"; endpoint: string; payload: Record<string, unknown> } {
  const ep = endpointFor(miner, intent);
  const method = (ep?.method ?? "GET").toUpperCase() === "POST" ? "POST" : "GET";
  const props = Object.keys(miner.input_schema?.properties ?? {});
  const payload: Record<string, unknown> = { query: question };
  const prose = props.filter((k) => PROSE_KEYS.includes(k));
  for (const k of prose) payload[k] = question;
  // OpenAI-shaped miners take the question as a one-turn conversation. Sent when the
  // miner declares it, and also for the chat-shaped intents whether or not they do —
  // telegraph-chatbot declares an empty schema and then rejects the call for a
  // missing `messages` body.
  if (props.includes(MESSAGES_KEY) || (intent && CHAT_INTENTS.has(intent))) {
    payload[MESSAGES_KEY] = [{ role: "user", content: question }];
  }
  // Subject keys are a fallback for miners that take no prose at all, like
  // openweathermap (lat, lon, q). Filling them alongside a prose key does harm:
  // chainsight-oracle declares `address` and `symbol`, and handing it a place name
  // there made the node correctly predict the request would fail.
  if (subject && prose.length === 0) {
    for (const k of props) if (SUBJECT_KEYS.includes(k)) payload[k] = subject;
  }
  return { method, endpoint: ep?.path ?? "/", payload };
}

export function shouldSeekSecondOpinion(receipt: Receipt): boolean {
  // A risk score is not a confidence: a low one means "safe", not "unsure", and would
  // otherwise trigger a second opinion on every calm weather report (GAPS G8).
  if (receipt.confidenceIsRisk) return false;
  return receipt.confidence !== null && receipt.confidence < config().SECOND_OPINION_THRESHOLD && Boolean(receipt.intent);
}

export function baseRow(ctx: AskContext, kind: string, question: string): CallRow {
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
    settlementTx: null,
    routedBy: null,
    label: null,
    answer: null,
    groupId: null,
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
  row.settlementTx = r.settlementTx;
  // txlens maps label_field to its whole answer; a label is a verdict, not an essay.
  row.label = r.label ? r.label.replace(/\s+/g, " ").slice(0, 200) : null;
  row.answer = answerExcerpt(r.answer);
  row.status = status;
}
