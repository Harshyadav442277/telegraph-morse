/**
 * Prints the sample questions in docs/TRY_THESE.md and checks each one against the
 * real classifier and the live intent list.
 *
 *   npm run try-questions
 *
 * Free: it classifies locally and reads the node's free intent list. It asks nothing
 * and pays nothing, so it can be run as often as you like (rule 04).
 *
 * Run it before sharing the list — a rule change or a miner deregistration can leave
 * a question pointing at an intent nobody serves, and it is better to find that here
 * than in front of someone trying the bot.
 */
import { EXAMPLES } from "../src/core/examples.js";
import { classifyIntent } from "../src/core/route.js";
import { getIntents } from "../src/core/telegraph.js";

export const QUESTIONS: Array<{ intent: string; q: string }> = EXAMPLES.map((e) => ({ intent: e.intent, q: e.q }));

async function main(): Promise<void> {
  const live = new Set((await getIntents()).filter((i) => i.miner_count > 0).map((i) => i.intent_id));
  let bad = 0;

  console.log(`\n${QUESTIONS.length} sample questions, checked ${new Date().toISOString()}\n`);
  for (const { intent, q } of QUESTIONS) {
    const got = classifyIntent(q)?.intent ?? "CHAT_COMPLETION";
    const routesRight = got === intent;
    const hasMiner = live.has(got);
    const flag = !routesRight ? `MISROUTED → ${got}` : !hasMiner ? "NO LIVE MINER" : "ok";
    if (flag !== "ok") bad++;
    console.log(`  ${flag === "ok" ? "ok  " : "FAIL"} ${intent.padEnd(22)} ${q}`);
    if (flag !== "ok") console.log(`       ${flag}`);
  }

  const covered = new Set(QUESTIONS.map((x) => x.intent));
  console.log(`\n${covered.size} distinct intents covered, ${QUESTIONS.length - bad}/${QUESTIONS.length} routing as intended.`);
  if (bad > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`try-questions failed: ${(e as Error).message}`);
  process.exitCode = 1;
});
