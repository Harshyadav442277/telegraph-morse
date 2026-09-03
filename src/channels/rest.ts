import type { Context, Hono, Next } from "hono";
import { config } from "../config.js";
import { askNetwork, type AskContext } from "../core/ask.js";
import { bearer, hashId, hashKey, newApiKey } from "../core/ids.js";
import { getLedger } from "../core/ledger/index.js";
import type { ApiKeyRow } from "../core/ledger/types.js";
import { RECIPES, runRecipe } from "../core/recipes.js";
import { askPodium } from "../core/podium.js";
import { getIntents, leaderboard } from "../core/telegraph.js";

/**
 * Developer surface: self-issued keys, `POST /v1/ask`, and free discovery. The same
 * keys authenticate the MCP endpoint (ARCHITECTURE A9).
 */
export interface KeyIdentity { ctx: AskContext; key: ApiKeyRow }

/** Hono environment shared by every channel: the authenticated key identity, when present. */
export type AppEnv = { Variables: { identity: KeyIdentity } };

export function clientIp(c: Context): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
}

export async function authenticateKey(c: Context, channel: "mcp" | "rest"): Promise<KeyIdentity | null> {
  const token = bearer(c.req.header("authorization")) ?? c.req.query("key");
  if (!token || !token.startsWith("morse_")) return null;
  const key = await getLedger().findApiKey(hashKey(token));
  if (!key) return null;
  return { key, ctx: { channel, userHash: hashId("key", key.keyHash, config().HASH_SALT), keyCap: key.dailyCap } };
}

export async function issueKey(c: Context, label: string): Promise<{ key: string; dailyCap: number } | { error: string; status: 429 | 400 }> {
  const cfg = config();
  const issuerHash = hashId("ip", clientIp(c), cfg.HASH_SALT);
  const ledger = getLedger();
  if ((await ledger.keysIssuedToday(issuerHash)) >= 3) return { error: "Key limit reached for today from this network.", status: 429 };
  const clean = label.replace(/[^\w .-]/g, "").slice(0, 60) || "unnamed";
  const { key, keyHash } = newApiKey();
  await ledger.insertApiKey({ keyHash, label: clean, dailyCap: cfg.PER_API_KEY_DAILY, issuedAt: new Date().toISOString(), issuerHash });
  return { key, dailyCap: cfg.PER_API_KEY_DAILY };
}

async function requireKey(c: Context, next: Next) {
  const id = await authenticateKey(c, "rest");
  if (!id) return c.json({ error: "Missing or unknown key. Get one at /keys and send it as 'Authorization: Bearer morse_…'." }, 401);
  c.set("identity", id);
  await next();
}

export function restRoutes(app: Hono<AppEnv>): void {
  app.post("/api/keys", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { label?: string };
    const r = await issueKey(c, String(body.label ?? ""));
    if ("error" in r) return c.json({ error: r.error }, r.status);
    return c.json({ key: r.key, dailyCap: r.dailyCap, note: "Shown once. Send as Authorization: Bearer <key>." });
  });

  app.get("/v1/intents", async (c) => c.json({ intents: await getIntents() }));

  app.get("/v1/leaderboard/:intent", async (c) => {
    const board = await leaderboard(c.req.param("intent").toUpperCase());
    return c.json({ intent: c.req.param("intent").toUpperCase(), miners: board.map((e) => ({ slug: e.miner.slug, id: e.miner.id, rank: e.rank, score: e.score })) });
  });

  /** Ask the podium on an earlier answer, by its signal hash. */
  app.post("/v1/podium", requireKey, async (c) => {
    const { ctx } = c.get("identity");
    const body = (await c.req.json().catch(() => ({}))) as { signal_hash?: string; hash?: string };
    const hash = String(body.signal_hash ?? body.hash ?? "");
    if (!/^0x[0-9a-fA-F]{8,64}$/.test(hash)) return c.json({ error: "Send {\"signal_hash\": \"0x…\"} from an earlier /v1/ask receipt." }, 400);
    const res = await askPodium(ctx, await getLedger().answerByHashPrefix(hash));
    return c.json({ ...res, original: res.original ? { minerSlug: res.original.minerSlug, minerRank: res.original.minerRank, signalHash: res.original.signalHash } : null, members: res.members.map(({ receipt, ...m }) => ({ ...m, costUsd: receipt?.costUsd ?? null, durationMs: receipt?.durationMs ?? null })) }, res.error ? 400 : 200);
  });

  app.post("/v1/ask", requireKey, async (c) => {
    const { ctx } = c.get("identity");
    const body = (await c.req.json().catch(() => ({}))) as { question?: string; recipe?: string; input?: string };
    if (body.recipe) {
      const recipe = RECIPES[body.recipe];
      if (!recipe) return c.json({ error: `Unknown recipe. Available: ${Object.keys(RECIPES).join(", ")}` }, 400);
      const res = await runRecipe(ctx, recipe, String(body.input ?? body.question ?? ""));
      return c.json(res, res.error ? 400 : 200);
    }
    const q = String(body.question ?? "").trim();
    if (q.length < 3) return c.json({ error: "Send {\"question\": \"…\"} or {\"recipe\": \"safe\", \"input\": \"https://…\"}." }, 400);
    const card = await askNetwork(ctx, q, "ask");
    return c.json(card, card.ok ? 200 : 502);
  });
}
