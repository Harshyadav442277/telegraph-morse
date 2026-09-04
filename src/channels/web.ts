import type { Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { randomUUID } from "node:crypto";
import { config, configProblems, paidWorkEnabled } from "../config.js";
import { askNetwork, type AskContext } from "../core/ask.js";
import { EXAMPLES, GROUPS, parseSlash, QUICK } from "../core/examples.js";
import { getReconciliation } from "../core/proof.js";
import { proofPage } from "../web/proof.js";
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
    const [stats, recent, latest] = await Promise.all([ledger.stats(), ledger.recent(25), ledger.latestAnswered()]);
    return c.html(
      landingPage({
        stats,
        recent,
        latest,
        ledgerKind: ledger.kind,
        payer: payerAddress(),
        publicUrl: config().MORSE_PUBLIC_URL,
        botUsername: config().TELEGRAM_BOT_USERNAME,
        paid: paidWorkEnabled(),
        recipes: Object.values(RECIPES),
        quick: QUICK,
        groups: GROUPS,
        examples: EXAMPLES,
      }),
    );
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
        configProblems: configProblems(),
      },
      ok ? 200 : 503,
    );
  });

  /** On-chain proof: the ledger's settlement hashes matched against the payer's USDC transfers. */
  app.get("/proof", async (c) => {
    const ledger = getLedger();
    const [rows, stats] = await Promise.all([ledger.recent(2000), ledger.stats()]);
    const r = await getReconciliation(rows);
    return c.html(proofPage(r, { okCalls: stats.okCalls, miners: stats.miners, usersAnswered: stats.usersAnswered }));
  });
  app.get("/api/proof", async (c) => c.json(await getReconciliation(await getLedger().recent(2000))));

  app.post("/api/ask", async (c) => {
    const ctx = sessionCtx(c);
    const body = (await c.req.json().catch(() => ({}))) as { question?: string; recipe?: string; input?: string };
    let recipeName = body.recipe;
    let input = String(body.input ?? "");
    let q = String(body.question ?? "").trim();
    // People bring bot habits to the web box: "/safe https://…" used to be sent to the
    // network as a chat question. A recipe name typed with a slash runs the recipe.
    const slash = !recipeName && q.startsWith("/") ? parseSlash(q) : null;
    if (slash) {
      if (RECIPES[slash.command]) {
        recipeName = slash.command;
        input = slash.input;
      } else {
        return c.json({ error: `Unknown command /${slash.command}. Just type your question, or use /safe, /wallet, /weather or /fact.` }, 400);
      }
    }
    if (recipeName) {
      const recipe = RECIPES[recipeName];
      if (!recipe) return c.json({ error: "unknown recipe" }, 400);
      const res = await runRecipe(ctx, recipe, input);
      return c.json(res, res.error ? 400 : 200);
    }
    if (q.length < 3 || q.length > 2000) return c.json({ error: "Ask a question between 3 and 2000 characters." }, 400);
    const card = await askNetwork(ctx, q, "ask");
    return c.json(card, card.ok ? 200 : 502);
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
