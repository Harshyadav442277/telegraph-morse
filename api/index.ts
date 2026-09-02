import { getRequestListener } from "@hono/node-server";
import { app } from "../src/app.js";

/**
 * Vercel entrypoint. vercel.json rewrites every path here.
 *
 * Exported as a classic Node `(req, res)` listener rather than a Web-standard
 * `(Request) => Response` handler: the Node runtime always recognises the classic
 * signature, whereas a misdetected web handler never ends the response (504).
 */
export default getRequestListener(app.fetch);
