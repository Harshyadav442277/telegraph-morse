import { Hono } from "hono";
import { config } from "./config.js";
import { installWebhook } from "./channels/telegram.js";
import { telegramRoutes } from "./channels/telegram.js";
import { mcpRoutes } from "./channels/mcp.js";
import { restRoutes, type AppEnv } from "./channels/rest.js";
import { webRoutes } from "./channels/web.js";
import { bearer, secretsMatch } from "./core/ids.js";

/** One Hono app for every channel; served by Vercel (api/index.ts) and locally (server.ts). */
export const app = new Hono<AppEnv>();

app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: err.message }, 500);
});

app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));

webRoutes(app);
restRoutes(app);
mcpRoutes(app);
telegramRoutes(app);

/** Operator-only: register the Telegram webhook for MORSE_PUBLIC_URL. */
app.post("/admin/telegram/webhook", async (c) => {
  const cfg = config();
  if (!cfg.ADMIN_TOKEN || !secretsMatch(bearer(c.req.header("authorization")), cfg.ADMIN_TOKEN)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const url = cfg.MORSE_PUBLIC_URL ?? new URL(c.req.url).origin;
  return c.json({ ok: true, webhook: `${url}/telegram/webhook`, result: await installWebhook(url) });
});

app.notFound((c) => c.json({ error: "not found" }, 404));

export default app;
