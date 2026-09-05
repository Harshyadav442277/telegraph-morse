import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Hono } from "hono";
import { z } from "zod";
import { config } from "../config.js";
import { askNamedMiner, askNetwork, type AskContext } from "../core/ask.js";
import { RECIPES, runRecipe } from "../core/recipes.js";
import { verifySignal } from "../core/telegraph.js";
import { authenticateKey, type AppEnv } from "./rest.js";

/**
 * Hosted MCP server (Streamable HTTP, stateless). One `McpServer` per request keeps
 * serverless simple; the key in the Authorization header is the identity
 * (ARCHITECTURE A9). Agents get Telegraph without a wallet.
 */
function text(obj: unknown) {
  return { content: [{ type: "text" as const, text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] };
}

export function buildServer(ctx: AskContext): McpServer {
  const server = new McpServer({ name: "morse", version: "0.1.0" });
  const publicUrl = config().MORSE_PUBLIC_URL ?? "";

  server.registerTool(
    "telegraph_ask",
    {
      title: "Ask the Telegraph network",
      description:
        "Ask any question in plain language. Telegraph's own router classifies the intent and picks a ranked miner (Morse falls back to its own routing only if the router does not answer); Morse pays the x402 fee. Returns the answer plus a receipt: miner, intent, rank, routedBy, confidence, cost, latency, on-chain settlement tx and a signal_hash verifiable at " +
        (publicUrl ? `${publicUrl}/verify/{signal_hash}` : "GET /engine/v1/signal/{hash}") +
        ". Good for weather, crypto and stock prices, fact checks, translations, on-chain lookups, TLS checks, IP geolocation, academic and news search.",
      inputSchema: { question: z.string().min(3).max(2000) },
    },
    async ({ question }) => text(await askNetwork(ctx, question, "ask")),
  );

  server.registerTool(
    "telegraph_ask_miner",
    {
      title: "Ask one named miner directly",
      description:
        "Bypass routing and ask a specific miner by slug or catalogue id — the same direct dispatch Telegraph's own reference apps use. Costs one paid call; the receipt says routing was bypassed at your request. Find slugs at GET /v1/leaderboard/{INTENT} on this host (free), or on Telegraph's explorer.",
      inputSchema: { miner: z.string().min(1).max(64), question: z.string().min(3).max(2000) },
    },
    async ({ miner, question }) => text(await askNamedMiner(ctx, miner, question)),
  );

  server.registerTool(
    "telegraph_recipe",
    {
      title: "Run a multi-intent recipe",
      description: `Combine several intents into one verdict. Recipes: ${Object.values(RECIPES).map((r) => `${r.name} (${r.description})`).join("; ")}. Each sub-question is a separate paid, receipted call.`,
      inputSchema: { recipe: z.enum(Object.keys(RECIPES) as [string, ...string[]]), input: z.string().min(2).max(500) },
    },
    async ({ recipe, input }) => {
      const r = RECIPES[recipe];
      if (!r) return text({ error: "unknown recipe" });
      return text(await runRecipe(ctx, r, input));
    },
  );

  server.registerTool(
    "telegraph_verify_signal",
    {
      title: "Verify a signal hash",
      description: "Fetch the node's record for a signal_hash: the miner, the payer wallet, the settlement tx and the payload the hash commits to. Free.",
      inputSchema: { signal_hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) },
    },
    async ({ signal_hash }) => text(await verifySignal(signal_hash)),
  );

  // telegraph_intents, telegraph_leaderboard and telegraph_hot_signals were removed on
  // 2026-09-05: they duplicated Telegraph's own explorer and Daemon feed, which is the
  // kind of tooling the organizers said not to rebuild. The same data stays free over
  // REST at /v1/intents and /v1/leaderboard/{INTENT}.

  return server;
}

export function mcpRoutes(app: Hono<AppEnv>): void {
  app.all("/mcp", async (c) => {
    const id = await authenticateKey(c, "mcp");
    if (!id) {
      return c.json(
        { error: "Missing or unknown key. Get one at /keys and send it as 'Authorization: Bearer morse_…'." },
        401,
        { "www-authenticate": 'Bearer realm="morse"' },
      );
    }
    // No sessionIdGenerator → stateless mode: one server per request suits serverless.
    const transport = new StreamableHTTPTransport();
    const server = buildServer(id.ctx);
    await server.connect(transport);
    const res = await transport.handleRequest(c);
    return res ?? c.body(null, 202);
  });
}
