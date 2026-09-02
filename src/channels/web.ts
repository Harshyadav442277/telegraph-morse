import type { Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { randomUUID } from "node:crypto";
import { config, paidWorkEnabled } from "../config.js";
import { askNetwork, secondOpinion, secondOpinionOn, shouldSeekSecondOpinion, type AskContext } from "../core/ask.js";
import { hashId } from "../core/ids.js";
import { getLedger } from "../core/ledger/index.js";
import { RECIPES, runRecipe } from "../core/recipes.js";
import { payerAddress, payerUsdcBalance, verifySignal } from "../core/telegraph.js";
import { keysPage } from "../web/keys.js";
import type { AppEnv } from "./rest.js";
import { landingPage } from "../web/landing.js";
import { verifyPage } from "../web/verify.js";

/** Web channel: the landing page with the public ledger, the ask box, verification, keys. */
function sessionCtx(c: Context): AskContext {
  let sid = getCookie(c, "morse_sid");
  if (!sid) {
    sid = randomUUID();
    setCookie(c, "morse_sid", sid, { httpOnly: true, sameSite: "Lax", secure: true, maxAge: 60 * 60 * 24 * 90, path: "/" });
  }
  return { channel: "web", userHash: hashId("web", sid, config().HASH_SALT) };
}

export function webRoutes(app: Hono<AppEnv>): void {
  app.get("/", async (c) => {
    const ledger = getLedger();
    const [stats, recent] = await Promise.all([ledger.stats(), ledger.recent(25)]);
    return c.html(landingPage({ stats, recent, ledgerKind: ledger.kind, payer: payerAddress(), publicUrl: config().MORSE_PUBLIC_URL, paid: paidWorkEnabled(), recipes: Object.values(RECIPES) }));
  });

  app.get("/api/stats", async (c) => c.json({ ...(await getLedger().stats()), ledger: getLedger().kind, payer: payerAddress() }));

  app.get("/api/recent", async (c) => {
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") ?? 50)));
    const rows = await getLedger().recent(limit);
    return c.json({ rows: rows.map(({ userHash: _u, ...r }) => r) });
  });

  app.get("/api/health", async (c) => {
    const ledger = getLedger();
    const [stats, balance, today] = await Promise.all([ledger.stats(), payerUsdcBalance(), ledger.callsToday()]);
    const cfg = config();
    const ok = ledger.kind === "postgres" && paidWorkEnabled(cfg) && (balance ?? 0) > 0.5;
    return c.json(
      {
        ok,
        ledger: ledger.kind,
        payer: payerAddress(),
        payerUsdc: balance,
        paidWorkEnabled: paidWorkEnabled(cfg),
        budgetRemainingToday: Math.max(0, cfg.DAILY_BUDGET_CALLS - today),
        lastCallAt: stats.lastCallAt,
        telegram: Boolean(cfg.TELEGRAM_BOT_TOKEN),
      },
      ok ? 200 : 503,
    );
  });

  app.post("/api/ask", async (c) => {
    const ctx = sessionCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as { question?: string; recipe?: string; input?: string };
    if (body.recipe) {
      const recipe = RECIPES[body.recipe];
      if (!recipe) return c.json({ error: "unknown recipe" }, 400);
      const res = await runRecipe(ctx, recipe, String(body.input ?? ""));
      return c.json(res, res.error ? 400 : 200);
    }
    const q = String(body.question ?? "").trim();
    if (q.length < 3 || q.length > 2000) return c.json({ error: "Ask a question between 3 and 2000 characters." }, 400);
    const card = await askNetwork(ctx, q, "ask");
    // Same rule as Telegram: a miner that reports low confidence gets checked against
    // the next-ranked one, in the same response.
    if (card.ok && card.receipt && shouldSeekSecondOpinion(card.receipt) && card.receipt.intent) {
      const s = await secondOpinion(ctx, q, card.receipt.intent, card.receipt.minerSlug);
      card.second = s.receipt;
    }
    return c.json(card, card.ok ? 200 : 502);
  });

  /** Explicit second opinion on a receipt already in the ledger. */
  app.post("/api/second", async (c) => {
    const ctx = sessionCtx(c);
    const { hash } = (await c.req.json().catch(() => ({}))) as { hash?: string };
    if (!hash || !/^0x[0-9a-fA-F]{8,64}$/.test(hash)) return c.json({ error: "Send {\"hash\": \"0x…\"}." }, 400);
    const res = await secondOpinionOn(ctx, await getLedger().answerByHashPrefix(hash));
    return c.json(
      {
        first: res.first
          ? { minerSlug: res.first.minerSlug, minerRank: res.first.minerRank, intent: res.first.intent, confidence: res.first.confidence, signalHash: res.first.signalHash }
          : null,
        second: res.second,
        error: res.error,
      },
      res.second ? 200 : res.first ? 502 : 404,
    );
  });

  app.get("/api/verify/:hash", async (c) => {
    try {
      const rec = await verifySignal(c.req.param("hash"));
      const payer = payerAddress();
      return c.json({ record: rec, paidByMorse: Boolean(payer && rec.signal?.wallet_address?.toLowerCase() === payer.toLowerCase()) });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 404);
    }
  });

  app.get("/verify/:hash", async (c) => {
    const hash = c.req.param("hash");
    const payer = payerAddress();
    const row = (await getLedger().recent(500)).find((r) => r.signalHash === hash) ?? null;
    try {
      const rec = await verifySignal(hash);
      const paidByMorse = Boolean(payer && rec.signal?.wallet_address?.toLowerCase() === payer.toLowerCase());
      return c.html(verifyPage({ hash, record: rec, paidByMorse, payer, row, error: null }));
    } catch (e) {
      return c.html(verifyPage({ hash, record: null, paidByMorse: false, payer, row, error: (e as Error).message }), 404);
    }
  });

  app.get("/keys", (c) => c.html(keysPage({ publicUrl: config().MORSE_PUBLIC_URL, dailyCap: config().PER_API_KEY_DAILY })));
}
