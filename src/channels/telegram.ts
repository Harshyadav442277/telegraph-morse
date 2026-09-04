import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import type { Hono } from "hono";
import type { AppEnv } from "./rest.js";
import { config } from "../config.js";
import { askNamedMiner, askNetwork, secondOpinion, secondOpinionOn, shouldSeekSecondOpinion, type AskContext } from "../core/ask.js";
import { defer } from "../core/defer.js";
import { EXAMPLES, QUICK } from "../core/examples.js";
import { cardHtml, esc, podiumHtml, recipeHtml, secondOpinionHtml } from "../core/format.js";
import { hashId } from "../core/ids.js";
import { getLedger } from "../core/ledger/index.js";
import type { CallRow } from "../core/ledger/types.js";
import { askPodium } from "../core/podium.js";
import { RECIPES, runRecipe } from "../core/recipes.js";
import { hotSignals, verifySignal } from "../core/telegraph.js";

/**
 * Telegram channel. The webhook is acknowledged at once; the paid work runs in the
 * background and edits the "asking…" message in place (ARCHITECTURE A5).
 */
let bot: Bot | null = null;
let botReady: Promise<void> | null = null;

const OPTS = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

function ctxFor(ctx: Context): AskContext {
  const id = String(ctx.from?.id ?? ctx.chat?.id ?? "anon");
  return { channel: "telegram", userHash: hashId("tg", id, config().HASH_SALT) };
}

/**
 * The question a plain text message is asking Morse, or null when it is not for Morse.
 * In a private chat every message is. In a group, only a message that @mentions the
 * bot or replies to one of its messages is — otherwise a bot added to a busy group
 * would pay for an answer to every line of conversation, which is both a budget leak
 * and exactly the manufactured traffic rule 04 forbids. Commands are handled elsewhere.
 */
export function addressedQuestion(text: string, o: { isGroup: boolean; botUsername?: string; repliedToBot?: boolean }): string | null {
  const t = text.trim();
  if (t.startsWith("/")) return null;
  if (!o.isGroup) return t.length >= 3 ? t : null;
  const mention = o.botUsername ? new RegExp(`@${o.botUsername.replace(/^@/, "")}\\b`, "gi") : null;
  if (mention && mention.test(t)) {
    const q = t.replace(mention, " ").replace(/\s+/g, " ").trim();
    return q.length >= 3 ? q : null;
  }
  if (o.repliedToBot) return t.length >= 3 ? t : null;
  return null;
}

/** The five examples on the /start keyboard: each is a specialised miner, so the receipt is striking. */
const START_EXAMPLES = QUICK.filter((e) => ["SSL_VERIFICATION", "WEATHER_CHECK", "CRYPTO_PRICE", "URL_SCAN", "FACT_CHECK"].includes(e.intent));

const START = [
  "<b>Morse</b> — ask anything, and Telegraph's miner network answers <b>with a receipt</b>.",
  "",
  "Just type a question. Or tap one below to see what an answer looks like: who answered, their rank, how confident, what it cost, and a signal hash you can verify.",
  "",
  "After any answer, tap <b>Ask the podium</b>: the other top-ranked miners answer the same question, side by side, and Morse says whether they agree.",
].join("\n");

const HELP = [
  "<b>Morse</b> — ask, and the Telegraph miner network answers with a receipt.",
  "",
  "Type a question in plain language. Examples:",
  ...QUICK.map((e) => `• ${esc(e.q)}`),
  "",
  "<b>Recipes</b> (several miners at once):",
  ...Object.values(RECIPES).map((r) => `${esc(r.usage)} — ${esc(r.description)}`),
  "",
  "/podium — the other top-ranked miners answer your last question; Morse compares them",
  "/second — one more miner, the next-ranked, on your last question",
  "/miner &lt;slug&gt; &lt;question&gt; — ask one named miner directly, routing bypassed (miner authors: try your own, with a receipt)",
  "/hot — what the network is asking itself right now",
  "/verify &lt;signal hash&gt; — check any receipt on the node",
  "/stats — public usage numbers",
  "",
  "<b>What you ask is public.</b> Every question is listed in the open ledger, clipped to 200 characters, with the miner and the receipt. Please do not send anything private.",
].join("\n");

export const COMMANDS = [
  { command: "start", description: "What Morse is, with example questions" },
  { command: "podium", description: "Other top-ranked miners answer your last question" },
  { command: "second", description: "A second opinion on your last question" },
  { command: "miner", description: "Ask one named miner directly: /miner <slug> <question>" },
  { command: "safe", description: "URL safety: link scan + TLS + IP location" },
  { command: "weather", description: "Current weather + 48h storm risk for a place" },
  { command: "wallet", description: "Balance + fraud risk for an address" },
  { command: "fact", description: "Fact check + latest news for a claim" },
  { command: "hot", description: "What the network is asking itself" },
  { command: "verify", description: "Check a signal hash on the node" },
  { command: "stats", description: "Public usage numbers" },
  { command: "help", description: "All commands" },
];

function startKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  START_EXAMPLES.forEach((e, i) => {
    kb.text(e.label, `ex:${EXAMPLES.indexOf(e)}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

export function getBot(): Bot {
  if (bot) return bot;
  const c = config();
  if (!c.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const b = new Bot(c.TELEGRAM_BOT_TOKEN);

  /** Ask, then edit the progress message into the answer with a podium button. */
  async function answer(ctx: Context, q: string, progressId: number): Promise<void> {
    const a = ctxFor(ctx);
    const card = await askNetwork(a, q);
    if (card.ok && card.receipt && shouldSeekSecondOpinion(card.receipt) && card.receipt.intent) {
      const s = await secondOpinion(a, q, card.receipt.intent, card.receipt.minerSlug);
      card.second = s.receipt;
    }
    const kb = card.ok && card.receipt?.signalHash && card.receipt.intent
      ? new InlineKeyboard().text("Ask the podium", `pd:${card.receipt.signalHash.slice(0, 40)}`)
      : undefined;
    await edit(ctx, progressId, cardHtml(card, c.MORSE_PUBLIC_URL), kb);
  }

  b.command("start", (ctx) => ctx.reply(START, { ...OPTS, reply_markup: startKeyboard() }));
  b.command("help", (ctx) => ctx.reply(HELP, OPTS));

  b.callbackQuery(/^ex:(\d+)$/, async (ctx) => {
    const e = EXAMPLES[Number(ctx.match[1])];
    await ctx.answerCallbackQuery();
    if (!e) return;
    const progress = await ctx.reply(`<i>${esc(e.q)}</i>\n\nAsking the Telegraph network…`, OPTS);
    defer(answer(ctx, e.q, progress.message_id));
  });

  b.command("stats", async (ctx) => {
    const s = await getLedger().stats();
    const url = c.MORSE_PUBLIC_URL ? `\n${c.MORSE_PUBLIC_URL}` : "";
    await ctx.reply(
      `<b>Morse so far</b>\n${s.usersAnswered} people answered (${s.users} asked) · ${s.okCalls} answered calls · ${s.intents} intents · ${s.miners} miners · $${s.spentUsd.toFixed(2)} paid to the network\nToday: ${s.today.calls} calls from ${s.today.users} users${esc(url)}`,
      OPTS,
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
        OPTS,
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
      await ctx.reply(`<b>What the network is asking itself</b>\n${lines.join("\n")}`, OPTS);
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

  /** Podium on a row: the other top-ranked miners for the same intent, side by side. */
  async function podiumOn(ctx: Context, row: CallRow | null, progressId: number): Promise<void> {
    const res = await askPodium(ctxFor(ctx), row);
    await edit(ctx, progressId, podiumHtml(res, c.MORSE_PUBLIC_URL));
  }

  b.command("podium", async (ctx) => {
    const progress = await ctx.reply("Asking the other top-ranked miners… (up to ~30 s)");
    defer(
      (async () => {
        const row = await getLedger().lastAnswerFor(ctxFor(ctx).userHash);
        await podiumOn(ctx, row, progress.message_id);
      })(),
    );
  });

  b.callbackQuery(/^pd:(.+)$/, async (ctx) => {
    const prefix = ctx.match[1] ?? "";
    await ctx.answerCallbackQuery({ text: "Asking the other top-ranked miners…" });
    const progress = await ctx.reply("Asking the other top-ranked miners… (up to ~30 s)");
    defer(
      (async () => {
        await podiumOn(ctx, await getLedger().answerByHashPrefix(prefix), progress.message_id);
      })(),
    );
  });

  b.command("miner", async (ctx) => {
    const m = /^(\S+)\s+([\s\S]{3,})$/.exec((ctx.match ?? "").trim());
    if (!m) return ctx.reply("Usage: /miner <slug or id> <question> — e.g. /miner livecert Is the certificate for github.com valid?");
    const progress = await ctx.reply(`Asking <b>${esc(m[1]!)}</b> directly…`, OPTS);
    defer(
      (async () => {
        const card = await askNamedMiner(ctxFor(ctx), m[1]!, m[2]!);
        await edit(ctx, progress.message_id, cardHtml(card, c.MORSE_PUBLIC_URL));
      })(),
    );
  });

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

  b.on("message:text", async (ctx) => {
    const type = ctx.chat?.type;
    const q = addressedQuestion(ctx.message.text, {
      isGroup: type === "group" || type === "supergroup",
      botUsername: ctx.me?.username,
      repliedToBot: ctx.message.reply_to_message?.from?.id === ctx.me?.id,
    });
    if (q === null) return;
    const progress = await ctx.reply("Asking the Telegraph network…");
    defer(answer(ctx, q, progress.message_id));
  });

  b.catch((err) => console.error("telegram handler error:", err.error));
  bot = b;
  return b;
}

async function edit(ctx: Context, messageId: number, html: string, kb?: InlineKeyboard): Promise<void> {
  const chat = ctx.chat?.id;
  if (!chat) return;
  try {
    await ctx.api.editMessageText(chat, messageId, html, { ...OPTS, ...(kb ? { reply_markup: kb } : {}) });
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

/** Operator action: point Telegram at this deployment and publish the command menu. Needs ADMIN_TOKEN. */
export async function installWebhook(publicUrl: string): Promise<unknown> {
  const cfg = config();
  const b = getBot();
  const webhook = await b.api.setWebhook(`${publicUrl.replace(/\/+$/, "")}/telegram/webhook`, {
    ...(cfg.TELEGRAM_WEBHOOK_SECRET ? { secret_token: cfg.TELEGRAM_WEBHOOK_SECRET } : {}),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  const commands = await b.api.setMyCommands(COMMANDS);
  return { webhook, commands };
}
