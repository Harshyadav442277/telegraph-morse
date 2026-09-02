import { handle } from "hono/vercel";
import { app } from "../src/app.js";

/** Vercel entrypoint. vercel.json rewrites every path here. */
export default handle(app);
