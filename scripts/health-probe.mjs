#!/usr/bin/env node
/**
 * Health probe for the live deployment. Free: it reads /api/health and /api/stats and
 * never asks the network, so a schedule running this can never inflate call volume
 * (rule 04).
 *
 *   node scripts/health-probe.mjs [--url https://host] [--json]
 *
 * Exit 0 = healthy, 1 = alarm, 2 = the probe itself could not run. The GitHub Actions
 * workflow turns exit 1 into an issue; run it by hand any time to see the same verdict.
 */

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const BASE = (flag("url", process.env.MORSE_URL ?? "https://telegraph-morse.vercel.app")).replace(/\/+$/, "");
const AS_JSON = args.includes("--json");
const MIN_USDC = Number(flag("min-usdc", "1"));
/** A funded, used Morse that has answered nothing for this long is probably broken. */
const STALE_HOURS = Number(flag("stale-hours", "24"));

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(25_000),
    headers: { "user-agent": "morse-health-probe" },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${path} did not return JSON (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }
  return { status: res.status, body };
}

async function main() {
  const problems = [];
  const notes = [];

  const health = await get("/api/health");
  const h = health.body;

  if (h.ok !== true) problems.push(`/api/health reports ok:false (HTTP ${health.status})`);
  if (h.ledger !== "postgres") problems.push(`ledger is "${h.ledger}" — the durable ledger is not connected`);
  if (!h.paidWorkEnabled) problems.push("paid work is disabled: no payer key, no daily budget, or the kill switch is on");
  if (h.payer && h.payerUsdc !== null && h.payerUsdc < MIN_USDC) {
    problems.push(`payer holds ${h.payerUsdc} USDC, below the ${MIN_USDC} floor — top up at faucet.circle.com`);
  }
  if (h.paidWorkEnabled && h.budgetRemainingToday === 0) notes.push("today's call budget is spent");
  if (!h.telegram) notes.push("the Telegram bot token is not set");

  const stats = await get("/api/stats");
  const s = stats.body;
  if (h.paidWorkEnabled && s.okCalls > 0 && s.lastCallAt) {
    const hours = (Date.now() - Date.parse(s.lastCallAt)) / 3_600_000;
    if (hours > STALE_HOURS) problems.push(`no answered call for ${hours.toFixed(1)}h`);
  }

  // The landing page must render, not just the API.
  const home = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(25_000) });
  const html = await home.text();
  if (!home.ok) problems.push(`GET / returned HTTP ${home.status}`);
  else if (!html.includes("Public ledger")) problems.push("GET / rendered without the public ledger section");

  const verdict = {
    at: new Date().toISOString(),
    url: BASE,
    healthy: problems.length === 0,
    problems,
    notes,
    health: h,
    stats: { users: s.users, usersAnswered: s.usersAnswered, calls: s.calls, okCalls: s.okCalls, intents: s.intents, miners: s.miners, spentUsd: s.spentUsd, lastCallAt: s.lastCallAt },
  };

  if (AS_JSON) {
    console.log(JSON.stringify(verdict, null, 2));
  } else {
    console.log(`${verdict.healthy ? "HEALTHY" : "ALARM"} · ${BASE} · ${verdict.at}`);
    console.log(`ledger ${h.ledger} · payer ${h.payer ?? "none"} · ${h.payerUsdc ?? "?"} USDC · paid ${h.paidWorkEnabled} · telegram ${h.telegram}`);
    console.log(`${s.usersAnswered ?? "?"}/${s.users} people answered · ${s.okCalls}/${s.calls} calls answered · ${s.intents} intents · ${s.miners} miners · $${s.spentUsd} spent`);
    for (const p of problems) console.log(`  problem: ${p}`);
    for (const n of notes) console.log(`  note: ${n}`);
  }
  process.exit(verdict.healthy ? 0 : 1);
}

main().catch((e) => {
  console.error(`probe failed: ${e.message}`);
  process.exit(2);
});
