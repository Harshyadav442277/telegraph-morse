import { waitUntil } from "@vercel/functions";

/**
 * Run work after the HTTP response has been sent. On Vercel the platform keeps the
 * function alive for it (ARCHITECTURE A5); on a long-lived Node server it just runs.
 */
export function defer(work: Promise<unknown>): void {
  const guarded = work.catch((e) => console.error("deferred work failed:", (e as Error).message));
  if (process.env.VERCEL) {
    try {
      waitUntil(guarded);
      return;
    } catch {
      /* fall through: not inside a Vercel request context */
    }
  }
  void guarded;
}
