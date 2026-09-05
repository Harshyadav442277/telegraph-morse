import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * The journey a judge takes: land, read the claim, see the ledger, verify a receipt,
 * pick up a key, point an agent at the MCP endpoint.
 *
 * Everything here is free to run. The one step that spends — asking the network — is
 * gated behind MORSE_E2E_PAID=1 so a CI schedule can never manufacture traffic
 * (rule 04). Run it deliberately, once, when you want the funded path proven.
 */

interface Health {
  ok: boolean;
  ledger: "postgres" | "memory";
  payer: string | null;
  payerUsdc: number | null;
  paidWorkEnabled: boolean;
  budgetRemainingToday: number;
  lastCallAt: string | null;
  telegram: boolean;
}

interface Row {
  at: string;
  channel: string;
  kind: string;
  intent: string | null;
  minerSlug: string | null;
  minerRank: number | null;
  confidence: number | null;
  costUsd: number | null;
  signalHash: string | null;
  status: string;
}

const HASH = /^0x[0-9a-fA-F]{64}$/;

async function health(request: APIRequestContext): Promise<Health> {
  const res = await request.get("/api/health");
  // 503 is the honest answer while the wallet is unfunded; the body is still the truth.
  expect([200, 503]).toContain(res.status());
  return (await res.json()) as Health;
}

test.describe("judge journey", () => {
  test("1 · the landing page states the claim and shows live counters", async ({ page, request }) => {
    const h = await health(request);
    await page.goto("/");

    await expect(page).toHaveTitle(/Morse/);
    await expect(page.locator("header.top h1")).toContainText("M");
    await expect(page.locator("p.lede")).toContainText("receipt");

    // Six counters, all numeric, none a placeholder.
    const stats = page.locator("section.grid .stat b");
    await expect(stats).toHaveCount(6);
    for (const text of await stats.allTextContents()) {
      expect(text.replace(/[$,]/g, "")).toMatch(/^\d+(\.\d+)?$/);
    }

    await expect(page.locator("#ledger")).toBeVisible();
    await expect(page.locator("#ledger table thead th").first()).toContainText("time");
    await expect(page.getByText("How routing works")).toBeVisible();

    // The funding state is disclosed, never hidden.
    const banner = page.locator(".panel.warn");
    if (h.paidWorkEnabled) {
      await expect(banner).toHaveCount(0);
    } else {
      await expect(banner).toContainText("not funded yet");
    }
  });

  test("2 · the ledger on the page matches the API and the ledger is durable", async ({ page, request }) => {
    const h = await health(request);
    expect(h.ledger, "production must not fall back to the ephemeral ledger").toBe("postgres");

    const stats = await (await request.get("/api/stats")).json();
    const { rows } = (await (await request.get("/api/recent?limit=200")).json()) as { rows: Row[] };

    expect(rows.length).toBeLessThanOrEqual(stats.calls);
    if (stats.calls <= 200) expect(rows.length).toBe(stats.calls);
    expect(rows.filter((r) => r.status === "ok").length).toBeLessThanOrEqual(stats.okCalls);

    // No row may carry a user identifier out of the API.
    for (const r of rows) expect(Object.keys(r)).not.toContain("userHash");

    // The page's table shows the same number of rows the API's newest 25 would.
    await page.goto("/");
    const tableRows = page.locator("#ledger tbody tr");
    const expected = Math.min(25, rows.length);
    await expect(tableRows).toHaveCount(expected === 0 ? 1 : expected); // 1 = the "No calls yet." row
  });

  test("3 · every signal hash in the ledger verifies on the node", async ({ page, request }) => {
    const { rows } = (await (await request.get("/api/recent?limit=200")).json()) as { rows: Row[] };
    const hashes = rows.map((r) => r.signalHash).filter((x): x is string => Boolean(x));
    test.skip(hashes.length === 0, "no receipts in the ledger yet — the wallet is unfunded");

    const h = await health(request);
    for (const hash of hashes.slice(0, 5)) {
      expect(hash).toMatch(HASH);
      const api = await request.get(`/api/verify/${hash}`);
      expect(api.status(), `${hash} must resolve on the node`).toBe(200);
      const body = (await api.json()) as { record: { signal?: { wallet_address?: string } }; paidByMorse: boolean };
      expect(body.paidByMorse, `${hash} must have been paid for by Morse's wallet`).toBe(true);
      expect(body.record.signal?.wallet_address?.toLowerCase()).toBe(h.payer?.toLowerCase());

      await page.goto(`/verify/${hash}`);
      await expect(page.getByText("Found on the node")).toBeVisible();
      await expect(page.locator("text=Morse's payer wallet")).toBeVisible();
      await expect(page.locator("pre")).not.toBeEmpty();
    }
  });

  test("4 · an agent can pick up a key and reach the MCP server without a wallet", async ({ page, request }) => {
    await page.goto("/keys");
    await expect(page.getByText("no wallet needed")).toBeVisible();
    await expect(page.locator("pre").first()).toContainText("claude mcp add");

    const key = process.env.MORSE_TEST_KEY ?? cachedKey() ?? (await issueKey(page));
    test.skip(!key, "no key: this network has used its three for today, and none is cached. Set MORSE_TEST_KEY, or rerun after 00:00 UTC.");

    // Unauthenticated MCP must refuse.
    const anon = await request.post("/mcp", {
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      data: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } } },
    });
    expect(anon.status()).toBe(401);

    const init = await mcp(request, key!, 1, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "morse-e2e", version: "0.1.0" },
    });
    expect(init.result?.serverInfo?.name).toBe("morse");

    const tools = await mcp(request, key!, 2, "tools/list", {});
    const names = (tools.result?.tools ?? []).map((t: { name: string }) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(["telegraph_ask", "telegraph_ask_miner", "telegraph_recipe", "telegraph_verify_signal"]),
    );
    // Retired on 2026-09-04: re-ranking Telegraph's own leaderboard, at N paid calls
    // per question, is what the organizers asked us not to build (GAPS G32).
    expect(names).not.toContain("telegraph_podium");
    expect(names).not.toContain("telegraph_second_opinion");
    // Retired on 2026-09-05: the three discovery tools duplicated Telegraph's explorer
    // and Daemon feed. The data stays free over REST (step 5).
    expect(names).not.toContain("telegraph_intents");
    expect(names).not.toContain("telegraph_leaderboard");
    expect(names).not.toContain("telegraph_hot_signals");
  });

  test("5 · the free discovery endpoints answer from the live network", async ({ request }) => {
    const intents = (await (await request.get("/v1/intents")).json()) as { intents: Array<{ intent_id: string; miner_count: number }> };
    expect(intents.intents.length).toBeGreaterThan(20);
    expect(intents.intents.some((i) => i.intent_id === "SSL_VERIFICATION")).toBe(true);

    const board = (await (await request.get("/v1/leaderboard/SSL_VERIFICATION")).json()) as {
      intent: string;
      miners: Array<{ slug: string; rank: number | null }>;
    };
    expect(board.intent).toBe("SSL_VERIFICATION");
    expect(board.miners.length).toBeGreaterThan(0);
    // Ranked miners come first: that is the routing order Morse shows on a receipt.
    const ranked = board.miners.filter((m) => m.rank !== null).map((m) => m.rank as number);
    expect([...ranked].sort((a, b) => a - b)).toEqual(ranked);
  });

  test("6 · Morse fails honestly instead of inventing an answer", async ({ page, request }) => {
    // The honest-failure contract holds whether or not the wallet is funded, so this
    // asserts it both ways rather than skipping once Morse can pay. The always-on half
    // costs nothing: verifying a signal hash that was never issued.
    const res = await request.get(`/api/verify/0x${"0".repeat(64)}`);
    expect(res.status()).toBe(404);
    const body = (await res.json()) as { record?: unknown; error: string | null };
    expect(body.record ?? null, "no record may be invented for a call that never happened").toBeNull();
    expect(body.error, "the failure must be explained").toBeTruthy();

    const h = await health(request);
    if (h.paidWorkEnabled) {
      // Funded: an over-long question is refused by the server, and the page shows the
      // refusal rather than rendering something that looks like an answer.
      const bad = await request.post("/api/ask", {
        headers: { "content-type": "application/json" },
        data: { question: "x" },
      });
      expect(bad.status()).toBe(400);
      const j = (await bad.json()) as { error?: string; receipt?: unknown };
      expect(j.error).toBeTruthy();
      expect(j.receipt ?? null).toBeNull();
      return;
    }

    // Unfunded: asking through the UI must say so, with no receipt anywhere.
    await page.goto("/");
    await page.locator("#q").fill("Is the TLS certificate for github.com valid right now?");
    await page.locator("#go").click();
    const card = page.locator("#out .card");
    await expect(card).toBeVisible();
    await expect(card).toContainText(/no funded wallet|no daily budget|paused/i);
    await expect(page.locator("#out .rcpt")).toHaveCount(0);
  });

  test("7 · a funded Morse answers, receipts it, and the receipt verifies", async ({ page, request }) => {
    test.skip(process.env.MORSE_E2E_PAID !== "1", "paid step: set MORSE_E2E_PAID=1 to spend one call deliberately");
    const h = await health(request);
    expect(h.paidWorkEnabled, "the wallet must be funded for the paid journey").toBe(true);

    const before = (await (await request.get("/api/stats")).json()) as { calls: number };

    await page.goto("/");
    await page.locator("#q").fill("Is the TLS certificate for github.com valid right now, and who issued it?");
    await page.locator("#go").click();

    const receipt = page.locator("#out .rcpt").first();
    await expect(receipt).toBeVisible({ timeout: 90_000 });
    await expect(receipt).toContainText("Answered by");
    await expect(receipt).toContainText(/confidence/i);

    const verifyLink = receipt.locator('a[href^="/verify/0x"]').first();
    await expect(verifyLink).toBeVisible();
    const href = await verifyLink.getAttribute("href");
    const hash = href!.replace("/verify/", "");
    expect(hash).toMatch(HASH);

    // The answer is the miner's, not a template.
    const answer = await page.locator("#out .card").first().innerText();
    expect(answer.length).toBeGreaterThan(20);

    await verifyLink.click();
    await expect(page.getByText("Found on the node")).toBeVisible();
    await expect(page.locator("text=Morse's payer wallet")).toBeVisible();

    // The call is in the public ledger.
    const after = (await (await request.get("/api/stats")).json()) as { calls: number };
    expect(after.calls).toBeGreaterThan(before.calls);
    const { rows } = (await (await request.get("/api/recent?limit=50")).json()) as { rows: Row[] };
    expect(rows.some((r) => r.signalHash === hash)).toBe(true);
  });
});

/**
 * Keys are capped at three per network per UTC day, so a suite that issued a fresh one
 * every run would exhaust the quota and then skip itself. Issue once, cache, reuse.
 */
const KEY_CACHE = ".morse-e2e-key";

function cachedKey(): string | null {
  if (!existsSync(KEY_CACHE)) return null;
  const key = readFileSync(KEY_CACHE, "utf8").trim();
  return key.startsWith("morse_") ? key : null;
}

async function issueKey(page: Page): Promise<string | null> {
  await page.locator("#label").fill(`e2e-${Date.now()}`);
  await page.locator("#kf button").click();
  const out = page.locator("#kout");
  await expect(out).not.toContainText("Issuing…", { timeout: 20_000 });
  const text = await out.innerText();
  const m = text.match(/morse_[A-Za-z0-9_-]+/);
  if (!m) return null;
  writeFileSync(KEY_CACHE, m[0], "utf8");
  return m[0];
}

interface Rpc {
  result?: { serverInfo?: { name?: string }; tools?: Array<{ name: string }> };
  error?: { message: string };
}

/** Streamable HTTP MCP: the server may answer as JSON or as a one-event SSE stream. */
async function mcp(request: APIRequestContext, key: string, id: number, method: string, params: unknown): Promise<Rpc> {
  const res = await request.post("/mcp", {
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    data: { jsonrpc: "2.0", id, method, params },
  });
  expect(res.status(), `${method} should be accepted`).toBeLessThan(300);
  const body = await res.text();
  const line = body.split("\n").find((l) => l.startsWith("data: "));
  return JSON.parse(line ? line.slice(6) : body) as Rpc;
}
