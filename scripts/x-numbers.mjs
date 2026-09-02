#!/usr/bin/env node
/**
 * Prints the numbers an X post needs, straight from the live deployment and the live
 * node, so a draft is never posted with a stale or invented figure. Free: reads only
 * public, unpaid endpoints.
 *
 *   node scripts/x-numbers.mjs [--url https://host]
 */

const args = process.argv.slice(2);
const i = args.indexOf("--url");
const BASE = (i >= 0 && args[i + 1] ? args[i + 1] : process.env.MORSE_URL ?? "https://telegraph-morse.vercel.app").replace(/\/+$/, "");
const NODE = (process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com").replace(/\/+$/, "");

const json = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(40_000), headers: { "user-agent": "morse-x-numbers" } });
  if (!r.ok && r.status !== 503) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
};

const [stats, intents, miners, feed] = await Promise.all([
  json(`${BASE}/api/stats`),
  json(`${NODE}/engine/v1/intents`),
  json(`${NODE}/api/miners`),
  json(`${NODE}/daemon/api/questions?source=user&since_hours=24&limit=1`),
]);

const minerList = Array.isArray(miners) ? miners : (miners.miners ?? []);
const top = (stats.byIntent ?? []).slice(0, 3).map((r) => `${r.intent} ${r.calls}`).join(", ");

console.log(`as of ${new Date().toISOString()}`);
console.log("");
console.log("MORSE");
console.log(`  people answered ....... ${stats.usersAnswered ?? "n/a"}  (of ${stats.users} who asked)`);
console.log(`  calls answered ........ ${stats.okCalls}  (of ${stats.calls} attempted)`);
console.log(`  intents used .......... ${stats.intents}`);
console.log(`  miners served by ...... ${stats.miners}`);
console.log(`  paid to the network ... $${Number(stats.spentUsd).toFixed(2)}`);
console.log(`  today ................. ${stats.today?.calls ?? 0} calls from ${stats.today?.users ?? 0} people`);
console.log(`  by channel ............ ${JSON.stringify(stats.byChannel ?? {})}`);
console.log(`  top intents ........... ${top || "none yet"}`);
console.log(`  first / last call ..... ${stats.firstCallAt ?? "—"} / ${stats.lastCallAt ?? "—"}`);
console.log(`  payer ................. ${stats.payer ?? "not configured"}`);
console.log("");
console.log("TELEGRAPH NETWORK (context for the post)");
console.log(`  canonical intents ..... ${(intents.intents ?? intents).length}`);
console.log(`  active miners ......... ${minerList.filter((m) => m.activation_status === "active").length} of ${minerList.length}`);
console.log(`  user-paid calls, 24h .. ${feed.total ?? "?"} network-wide`);
console.log("");
console.log(`Ledger to screenshot: ${BASE}/#ledger`);
