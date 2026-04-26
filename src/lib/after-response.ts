import { after } from "next/server";

/**
 * Schedule a promise to settle after the HTTP response is sent without
 * blocking the request. Wraps Next.js `after()` so it can be called from
 * service-layer code (which may execute in non-request contexts during
 * tests/scripts).
 *
 * - In a request context: uses `after()` so Vercel keeps the function
 *   alive until the work resolves. Errors are swallowed.
 * - Outside a request context (tests, scripts): degrades to a detached
 *   `.catch()` so the call still doesn't throw.
 *
 * Use this for non-critical side effects (notifications, audit writes,
 * email sends) where the response should not block on the work but the
 * work must not be silently dropped if the function is torn down.
 */
export function runAfterResponse(work: Promise<unknown>): void {
  try {
    after(work.catch(() => {}));
  } catch {
    // after() throws when called outside a request scope. Keep the promise
    // attached so unhandled-rejection doesn't crash the process, but we
    // can't keep the runtime alive — that's only meaningful in production.
    void work.catch(() => {});
  }
}
