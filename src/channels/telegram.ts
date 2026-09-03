import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import type { Hono } from "hono";
import type { AppEnv } from "./rest.js";
import { config } from "../config.js";
import { askNetwork, secondOpinion, secondOpinionOn, shouldSeekSecondOpinion, type AskContext } from "../core/ask.js";
import { defer } from "../core/defer.js";
import { cardHtml, esc, recipeHtml, secondOpinionHtml } from "../core/format.js";
import { hashId } from "../core/ids.js";
import { getLedger } from "../core/ledger/index.js";
import type { CallRow } from "../core/ledger/types.js";
import { RECIPES, runRecipe } from "../core/recipes.js";
import { hotSignals, verifySignal } from "../core/telegraph.js";

/**
 * Telegram channel. The webhook is acknowledged at once; the paid work runs in the
 * background and edits the "asking…" message in place (ARCHITECTURE A5).
 */
let bot: Bot | null = null;
let botReady: Promise<void> | null = null;

function ctxFor(ctx: Context): AskContext {
  const id = String(ctx.from?.id ?? ctx.chat?.id ?? "anon");
  return { channel: "telegram", userHash: hashId("tg", id, config().HASH_SALT) };
}

const HELP = [
  "<b>Morse</b> — ask, and the Telegraph miner network answers with a receipt.",
  "",
  "Just type a question: weather, prices, fact checks, translations, on-chain lookups…",
  "",
  "<b>Recipes</b> (several intents combined):",
  ...Object.values(RECIPES).map((r) => `${esc(r.usage)} — ${esc(r.description)}`),
  "",
  "/second — ask the next-ranked miner the same question, and compare",
  "/hot — what the network is talking about right now",
  "/verify &lt;signal hash&gt; — check any receipt on the node",
  "/stats — public usage numbers",
  "",
  "Every answer names the miner, the intent, its confidence, the cost, and a signal hash you can verify. Morse pays the network on your behalf.",
  "",
  "<b>What you ask is public.</b> Every question is listed in the open ledger, clipped to 200 characters, alongside the miner and the receipt. Please do not send anything private.",
].join("\n");

export function getBot(): Bot {
  if (bot) return bot;
  const c = config();
  if (!c.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const b = new Bot(c.TELEGRAM_BOT_TOKEN);

  b.command(["start", "help"], (ctx) => ctx.reply(HELP, { parse_mode: "HTML", link_preview_options: { is_disabled: true } }));

  b.command("stats", async (ctx) => {
    const s = await getLedger().stats();
    const url = c.MORSE_PUBLIC_URL ? `\n${c.MORSE_PUBLIC_URL}` : "";
    await ctx.reply(
      `<b>Morse so far</b>\n${s.usersAnswered} people answered (${s.users} asked) · ${s.okCalls} answered calls · ${s.intents} intents · ${s.miners} miners · $${s.spentUsd.toFixed(2)} paid to the network\nToday: ${s.today.calls} calls from ${s.today.users} users${esc(url)}`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  });

  b.command("verify", async (ctx) => {
    const hash = (ctx.match ?? "").trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return ctx.reply("Send /verify followed by a 0x… signal hash.");
    try {
      const rec = await verifySignal(hash);
      const s = rec.signal ?? {};
      await ctx.reply(
        `<b>Signal found on the node</b>\nminer: ${esc(s.miner_slug ?? "?")}\npaid by: <code>${esc(s.wallet_address ?? "?")}</code>\nsettlement tx: ${s.tx_hash ? `<a href="https://sepolia.basescan.org/tx/${s.tx_hash}">${esc(s.tx_hash.slice(0, 14))}…</a>` : "n/a"}\nrecorded: ${esc(s.created_at ?? "?")}`,
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
      );
    } catch (e) {
      await ctx.reply(`Could not verify: ${(e as Error).message}`);
    }
  });

  b.command("hot", async (ctx) => {
    try {
      const rows = await hotSignals(5);
      if (rows.length === 0) return ctx.reply("The Daemon feed is quiet right now.");
      const lines = rows.map((r) => `• ${esc(r.question?.text ?? "?")} <i>(${esc(r.routing?.intent ?? r.question?.category ?? "?")})</i>`);
      await ctx.reply(`<b>What the network is asking itself</b>\n${lines.join("\n")}`, { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Feed unavailable: ${(e as Error).message}`);
    }
  });

  for (const recipe of Object.values(RECIPES)) {
    b.command(recipe.name, async (ctx) => {
      const input = (ctx.match ?? "").trim();
      if (!input) return ctx.reply(`Usage: ${recipe.usage}`);
      const progress = await ctx.reply(`Asking the network (${recipe.name})…`);
      defer(
        (async () => {
          const res = await runRecipe(ctxFor(ctx), recipe, input);
          await edit(ctx, progress.message_id, recipeHtml(res, c.MORSE_PUBLIC_URL));
        })(),
      );
    });
  }

  /** Ask the next-ranked miner for the same intent, and show both miners side by side. */
  async function replyWithSecondOpinion(ctx: Context, row: CallRow | null): Promise<void> {
    const res = await secondOpinionOn(ctxFor(ctx), row);
    const html = res.first
      ? secondOpinionHtml(res.first, res.second, res.error, c.MORSE_PUBLIC_URL)
      : `⚠️ ${esc(res.error ?? "Nothing to compare.")}`;
    await ctx.reply(html, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  }

  b.command("second", async (ctx) => {
    const progress = await ctx.reply("Asking the next-ranked miner…");
    defer(
      (async () => {
        const row = await getLedger().lastAnswerFor(ctxFor(ctx).userHash);
        const res = await secondOpinionOn(ctxFor(ctx), row);
        await edit(
          ctx,
          progress.message_id,
          res.first ? secondOpinionHtml(res.first, res.second, res.error, c.MORSE_PUBLIC_URL) : `⚠️ ${esc(res.error ?? "Nothing to compare.")}`,
        );
      })(),
    );
  });

  b.callbackQuery(/^so:(.+)$/, async (ctx) => {
    const prefix = ctx.match[1] ?? "";
    await ctx.answerCallbackQuery({ text: "Asking the next-ranked miner…" });
    await replyWithSecondOpinion(ctx, await getLedger().answerByHashPrefix(prefix));
  });

  b.on("message:text", async (ctx) => {
    const q = ctx.message.text.trim();
    if (q.startsWith("/") || q.length < 3) return;
    const progress = await ctx.reply("Asking the Telegraph network…");
    defer(
      (async () => {
        const a = ctxFor(ctx);
        const card = await askNetwork(a, q);
        if (card.ok && card.receipt && shouldSeekSecondOpinion(card.receipt) && card.receipt.intent) {
          const s = await secondOpinion(a, q, card.receipt.intent, card.receipt.minerSlug);
          card.second = s.receipt;
        }
        const kb = card.ok && card.receipt?.signalHash && card.receipt.intent && !card.second
          ? new InlineKeyboard().text("Second opinion", `so:${card.receipt.signalHash.slice(0, 40)}`)
          : undefined;
        await edit(ctx, progress.message_id, cardHtml(card, c.MORSE_PUBLIC_URL), kb);
      })(),
    );
  });

  b.catch((err) => console.error("telegram handler error:", err.error));
  bot = b;
  return b;
}

async function edit(ctx: Context, messageId: number, html: string, kb?: InlineKeyboard): Promise<void> {
  const chat = ctx.chat?.id;
  if (!chat) return;
  try {
    await ctx.api.editMessageText(chat, messageId, html, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(kb ? { reply_markup: kb } : {}),
    });
  } catch {
    // HTML the miner produced may not parse; fall back to plain text.
    await ctx.api.editMessageText(chat, messageId, html.replace(/<[^>]+>/g, ""), kb ? { reply_markup: kb } : {});
  }
}

export function telegramRoutes(app: Hono<AppEnv>): void {
  app.post("/telegram/webhook", async (c) => {
    const cfg = config();
    if (!cfg.TELEGRAM_BOT_TOKEN) return c.json({ error: "telegram is not configured" }, 503);
    const b = getBot();
    botReady ??= b.init();
    await botReady;
    const handler = webhookCallback(b, "hono", "return", 25_000, cfg.TELEGRAM_WEBHOOK_SECRET);
    return handler(c);
  });
}

/** Operator action: point Telegram at this deployment. Needs ADMIN_TOKEN. */
export async function installWebhook(publicUrl: string): Promise<unknown> {
  const cfg = config();
  const b = getBot();
  return b.api.setWebhook(`${publicUrl.replace(/\/+$/, "")}/telegram/webhook`, {
    ...(cfg.TELEGRAM_WEBHOOK_SECRET ? { secret_token: cfg.TELEGRAM_WEBHOOK_SECRET } : {}),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}
