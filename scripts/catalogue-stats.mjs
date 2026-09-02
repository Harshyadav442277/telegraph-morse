#!/usr/bin/env node
/**
 * Measures the live miner catalogue. Free — one GET of the public `/api/miners`, no
 * paid calls, no miner engaged (rule 04).
 *
 *   npm run catalogue
 *
 * These are the numbers behind GAPS G8 and G14, and the material for the "depth"
 * X post: facts about the network that are true whether or not Morse has traffic.
 */

const NODE = (process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com").replace(/\/+$/, "");
const QUESTION_KEYS = ["query", "q", "question", "text", "prompt", "input", "message"];
const RISK_FIELD = /(^|[._])(risk|danger|threat|severity|exploit_probability)/i;

const res = await fetch(`${NODE}/api/miners`, { signal: AbortSignal.timeout(60_000) });
const body = await res.json();
const all = Array.isArray(body) ? body : (body.miners ?? []);
const miners = all.filter((m) => m.activation_status === "active");

const pct = (n) => `${Math.round((n / miners.length) * 100)}%`;

console.log(`\nTelegraph miner catalogue · ${new Date().toISOString()}`);
console.log(`${miners.length} active miners of ${all.length} registered\n`);

// --- Confidence (GAPS G8) -------------------------------------------------
const declared = miners.filter((m) => m.signal_mapping?.confidence_field);
const risky = declared.filter((m) => RISK_FIELD.test(m.signal_mapping.confidence_field));
const fields = {};
for (const m of declared) {
  const f = m.signal_mapping.confidence_field;
  fields[f] = (fields[f] ?? 0) + 1;
}

console.log("CONFIDENCE (G8)");
console.log(`  declare a confidence_field   ${declared.length}/${miners.length} (${pct(declared.length)})`);
console.log(`  report nothing at all        ${miners.length - declared.length} (${pct(miners.length - declared.length)})`);
console.log(`  distinct field names         ${Object.keys(fields).length}`);
console.log(
  `  names                        ${Object.entries(fields)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ×${v}`)
    .join(", ")}`,
);
console.log(`  a RISK score, not confidence ${risky.length} → ${risky.map((m) => `${m.slug} (${m.signal_mapping.confidence_field})`).join(", ") || "none"}`);
console.log("    ↑ a high number here means more danger, not more certainty. Morse labels these");
console.log("      as risk and keeps them out of the second-opinion threshold.");

// --- Direct addressing (GAPS G14) ----------------------------------------
const multi = miners.filter((m) => (m.endpoints?.length ?? 0) > 1);
const withQuestionKey = miners.filter((m) =>
  Object.keys(m.input_schema?.properties ?? {}).some((k) => QUESTION_KEYS.includes(k)),
);
const post = miners.filter((m) => (m.endpoints?.[0]?.method ?? "GET").toUpperCase() === "POST");
const intentNamed = multi.filter((m) =>
  (m.endpoints ?? []).some((e) => (m.supported_intents ?? []).some((i) => (e.description ?? "").includes(i))),
);
const widest = [...miners].sort((a, b) => (b.endpoints?.length ?? 0) - (a.endpoints?.length ?? 0))[0];

console.log("\nDIRECT ADDRESSING, i.e. second opinions (G14)");
console.log(`  publish more than 1 endpoint ${multi.length} (${pct(multi.length)})`);
console.log(`    of those, name the intent   ${intentNamed.length} in an endpoint description — how Morse picks`);
console.log(`  widest surface               ${widest?.slug} with ${widest?.endpoints?.length} endpoints`);
console.log(`  accept a question-shaped key ${withQuestionKey.length} (${pct(withQuestionKey.length)})`);
console.log(`    the rest need typed inputs (lat/lon, an address, a hash) and will 422 a prose query`);
console.log(`  first endpoint is POST       ${post.length}; GET ${miners.length - post.length}`);

// --- Intent concentration -------------------------------------------------
const perIntent = {};
for (const m of miners) for (const i of m.supported_intents ?? []) perIntent[i] = (perIntent[i] ?? 0) + 1;
const sorted = Object.entries(perIntent).sort((a, b) => b[1] - a[1]);
console.log("\nINTENT COVERAGE");
console.log(`  intents with at least 1 miner ${sorted.length}`);
console.log(`  busiest   ${sorted.slice(0, 5).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`  thinnest  ${sorted.slice(-5).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`  served by exactly one miner   ${sorted.filter(([, v]) => v === 1).length} — no second opinion is possible there\n`);
