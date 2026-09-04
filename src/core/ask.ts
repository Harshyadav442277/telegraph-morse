import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { guardPaid } from "./guards.js";
import { getLedger } from "./ledger/index.js";
import type { CallRow, Channel } from "./ledger/types.js";
import { buildReceipt, type Receipt } from "./receipt.js";
import { askMiner, askRouted, getMiners, rankOf, resolveMiner, TelegraphError, withEndpointIntents, type Miner, type MinerEndpoint } from "./telegraph.js";
import { CHAT_INTENTS, classifyIntent, MESSAGES_KEY, PROSE_KEYS, routeCandidates, SUBJECT_KEYS, type Route } from "./route.js";

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
      return { ok: false, kind, question, receipt: null, error: g.reason ?? "Not allowed.", remaining, rowId: null };
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
        return { ok: true, kind, question, receipt: viaEngine, error: null, remaining, rowId: row.id, routedBy: "engine" };
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
        const target = await withEndpointIntents(cand.miner);
        const raw = await askMiner(cand.miner.id, directRequest(target, question, cand.intent, subject));
        raw.intent ??= cand.intent;
        const receipt = buildReceipt(raw, cand.miner.signal_mapping ?? null, cand.rank);
        receipt.minerSlug = cand.miner.slug;
        const after = i === 0 ? "" : ` The ${i} better-ranked miner${i > 1 ? "s" : ""} could not be paid or could not take the request.`;
        receipt.routerReasoning = `Telegraph's own router did not answer, so Morse routed this itself: ${cand.why}, then called the #${cand.rank ?? "?"} miner for ${cand.intent}.${after}`;
        fillRow(row, receipt, "ok");
        row.routedBy = "morse";
        await ledger.recordCall(row);
        return { ok: true, kind, question, receipt, error: null, remaining, rowId: row.id, routedBy: "morse" };
      } catch (inner) {
        const err = inner instanceof TelegraphError ? inner : new TelegraphError((inner as Error).message, "network");
        lastError = err;
        if (!isFreeFailure(err)) throw err;
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
    // The row keeps the node's raw text; the person gets a sentence. Nobody should be
    // shown `{"error":"upstream call failed: …PROOF_PIPELINE_ERROR…"}` and left to
    // guess whether they were charged.
    return { ok: false, kind, question, receipt: null, error: humanError(err, chosen), remaining, rowId: row.id, routedBy: row.routedBy };
  }
}

/** What a person should read when every miner that could take their question failed. */
export function humanError(err: TelegraphError, chosen: Route | null): string {
  const who = chosen ? ` The last one tried was ${chosen.miner.slug}.` : "";
  if (err.kind === "timeout") {
    return `That miner took too long to answer.${who} If the call lands late it will show on /proof as a settlement with no ledger row — Morse does not retry it, because retrying could pay twice.`;
  }
  if (err.kind === "unpaid") {
    return `Morse could not pay for this call, so nothing was asked and nothing was charged.${who}`;
  }
  if (err.status !== null && err.status >= 500) {
    return `Every miner serving this kind of question is failing right now.${who} That is the miner's error, not yours, and failed calls are not charged.`;
  }
  return err.message;
}

/**
 * Whether a failed attempt provably cost nothing, and so another miner may be tried.
 *
 * The node "settles only on 2xx; failed calls are free" (docs/TELEGRAPH_FACTS.md,
 * read 2026-09-02), so a refused payment, the node's free pre-validation and a 5xx
 * from a miner that broke are all safe to move on from. A **timeout is not**: we
 * never saw the outcome, the call may land and settle after we gave up, and the
 * chain-only settlements listed on /proof are exactly those. Unknown outcomes are
 * never retried; known-free ones are.
 *
 * This was too strict until 2026-09-04 and it cost real answers: every FACT_CHECK
 * question died on one miner returning `PROOF_PIPELINE_ERROR`, 11 of the 107 rows
 * on live kinds, while three other miners served the same intent (GAPS G33).
 */
export function isFreeFailure(err: TelegraphError): boolean {
  if (err.kind === "timeout") return false;
  if (err.kind === "unpaid") return true;
  return err.status !== null && (err.status === 422 || err.status >= 500);
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
    // what the ledger and the leaderboard key on, so resolve it here.
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
 * happens. The caller has already applied the spending guard for this call.
 */
export async function callMinerDirect(
  ctx: AskContext,
  miner: Miner,
  rank: number | null,
  intent: string,
  question: string,
  opts: { kind: string; timeoutMs?: number; subject?: string },
): Promise<DirectOutcome> {
  const row = baseRow(ctx, opts.kind, question);
  row.routedBy = "morse";
  row.intent = intent;
  row.minerSlug = miner.slug;
  row.minerId = miner.id;
  row.minerRank = rank;
  const ledger = getLedger();
  try {
    const target = await withEndpointIntents(miner);
    const raw = await askMiner(miner.id, directRequest(target, question, intent, opts.subject), opts.timeoutMs);
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
 * Which intent a question put to a named miner is filed under: the classified intent
 * when the miner serves it, otherwise the miner's first declared intent. The intent
 * only picks the endpoint and labels the row; the miner was chosen by the caller.
 */
export function intentForMiner(miner: Miner, question: string): string | null {
  const supported = miner.supported_intents ?? [];
  const guess = classifyIntent(question);
  if (guess && supported.includes(guess.intent)) return guess.intent;
  return supported[0] ?? null;
}

/**
 * Ask one named miner directly, by slug or catalogue id. This is the same direct
 * dispatch the organizers' own reference apps use — `/subnet-dispatcher/v1/<id>/…`
 * rather than the router. Routing is bypassed on purpose and the receipt says so;
 * every other rule — guards, ledger row, honest failure — is unchanged.
 */
export async function askNamedMiner(ctx: AskContext, ref: string, question: string): Promise<AnswerCard> {
  const kind = "direct";
  const fail = (error: string, remaining: number | null = null): AnswerCard => ({
    ok: false, kind, question, receipt: null, error, remaining, rowId: null, routedBy: "morse",
  });
  const key = ref.trim().replace(/^@/, "").toLowerCase();
  if (!key) return fail("Name a miner: its slug from the leaderboard, or its catalogue id.");
  const miners = await getMiners();
  const miner = miners.find((m) => m.slug.toLowerCase() === key || m.id === key || (m.name ?? "").toLowerCase() === key) ?? null;
  if (!miner) return fail(`No miner called "${ref.trim()}" is in the catalogue. Slugs are on /v1/leaderboard/{intent}.`);
  if (miner.activation_status !== "active") {
    return fail(`${miner.slug} is registered but not active (${miner.activation_status ?? "unknown"}), so the node will not serve it.`);
  }
  const intent = intentForMiner(miner, question);
  if (!intent) return fail(`${miner.slug} declares no intents, so there is nothing to ask it.`);
  await getLedger().touchUser(ctx.userHash, ctx.channel);
  const g = await guard(ctx, 1);
  if (!g.allowed) return fail(g.reason ?? "Not allowed.", g.remaining);
  const out = await callMinerDirect(ctx, miner, rankOf(miner, intent), intent, question, { kind });
  return { ok: Boolean(out.receipt), kind, question, receipt: out.receipt, error: out.error, remaining: g.remaining, rowId: out.row.id, routedBy: "morse" };
}

/**
 * Pick the endpoint that serves `intent`. 29 of the 129 active miners publish more
 * than one endpoint (measured 2026-09-02), and they name the intent at the start of
 * each description — degenlens-onchain lists 33, of which `endpoints[0]` is
 * ONCHAIN_TX_LOOKUP, so asking it a FRAUD_DETECTION question used to hit the wrong
 * endpoint entirely. Falls back to the first endpoint (GAPS G14).
 */
export function endpointFor(miner: Miner, intent: string | null): MinerEndpoint | undefined {
  const eps = miner.endpoints ?? [];
  if (intent) {
    // The manifest's own endpoint → intents map, when `withEndpointIntents` has read it.
    // The catalogue drops that list, and matching the description below guessed
    // /ssl-check for every livecert intent (GAPS G30).
    const declared = miner.endpoint_intents;
    const byManifest = declared && eps.find((e) => declared[e.path]?.includes(intent));
    if (byManifest) return byManifest;
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
