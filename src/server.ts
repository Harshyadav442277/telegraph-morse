import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config, paidWorkEnabled } from "./config.js";
import { getLedger } from "./core/ledger/index.js";
import { payerAddress } from "./core/telegraph.js";

/** Local development server. Production is served by Vercel through api/index.ts. */
const port = Number(process.env.PORT ?? 3000);
const c = config();
await getLedger().init();
serve({ fetch: app.fetch, port }, () => {
  console.log(`morse on http://localhost:${port}`);
  console.log(`ledger: ${getLedger().kind} · payer: ${payerAddress() ?? "none"} · paid work: ${paidWorkEnabled(c) ? "enabled" : "DISABLED"}`);
});
