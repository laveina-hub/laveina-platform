// ─── In-memory sliding window rate limiter ────────────────────────────────────
// Lightweight, no-dependency rate limiter for API routes.
// Uses a Map of token → timestamps. Suitable for single-instance deployments
// (Phase 1). For multi-instance, swap to Redis-backed limiter.
//
// Usage in API route:
//   const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
//   const ip = getClientIp(request);
//   const { success } = limiter.check(ip);
//   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type RateLimitConfig = {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Time window in milliseconds. */
  windowMs: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetMs: number;
};

type RateLimiter = {
  check: (token: string) => RateLimitResult;
};

/**
 * Creates a sliding window rate limiter instance.
 * Each instance maintains its own in-memory store — create one per route group
 * at module scope so it persists across requests.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const { limit, windowMs } = config;
  const store = new Map<string, number[]>();

  // Periodically clean up stale entries to prevent memory leaks
  const CLEANUP_INTERVAL_MS = 60_000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    const cutoff = now - windowMs;
    for (const [key, timestamps] of store) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }

  return {
    check(token: string): RateLimitResult {
      cleanup();

      const now = Date.now();
      const cutoff = now - windowMs;
      const timestamps = (store.get(token) ?? []).filter((t) => t > cutoff);

      if (timestamps.length >= limit) {
        const oldestInWindow = timestamps[0];
        return {
          success: false,
          remaining: 0,
          resetMs: oldestInWindow + windowMs - now,
        };
      }

      timestamps.push(now);
      store.set(token, timestamps);

      return {
        success: true,
        remaining: limit - timestamps.length,
        resetMs: windowMs,
      };
    },
  };
}

/**
 * Extracts client IP from request headers.
 * Checks x-forwarded-for (Vercel, proxies) first, then x-real-ip,
 * falls back to "unknown".
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list — take the first (client) IP
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(resetMs: number): NextResponse {
  const retryAfterSeconds = Math.ceil(resetMs / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

// ─── Pre-configured limiters ─────────────────────────────────────────────────
// Instantiated at module scope so they persist across requests within
// the same serverless invocation.
//
// Auth (login/register): NOT rate-limited here — auth is handled client-side
// via Supabase SDK (supabase.auth.signInWithPassword). Supabase's hosted GoTrue
// enforces its own rate limits on the auth endpoint (default: 30 req/5min per IP).
// See: https://supabase.com/docs/guides/auth/auth-rate-limits

/** Payment routes: 10 requests per minute */
export const paymentLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

/** OTP routes: 3 requests per 10 minutes */
export const otpLimiter = createRateLimiter({ limit: 3, windowMs: 600_000 });

/** QR scan routes: 30 requests per minute */
export const scanLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/** Public API routes: 60 requests per minute */
export const publicLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
