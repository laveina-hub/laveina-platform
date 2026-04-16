import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type RateLimitConfig = {
  limit: number;
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

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const { limit, windowMs } = config;
  const store = new Map<string, number[]>();

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

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

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

export const paymentLimiter = createRateLimiter({ limit: 5, windowMs: 300_000 });
export const otpLimiter = createRateLimiter({ limit: 3, windowMs: 900_000 });
export const scanLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const publicLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const authLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
