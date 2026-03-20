import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createRateLimiter } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createRateLimiter", () => {
    it("allows requests within the limit", () => {
      const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

      expect(limiter.check("user1").success).toBe(true);
      expect(limiter.check("user1").success).toBe(true);
      expect(limiter.check("user1").success).toBe(true);
    });

    it("blocks requests exceeding the limit", () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });

      limiter.check("user1");
      limiter.check("user1");

      const result = limiter.check("user1");
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("tracks different tokens independently", () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

      expect(limiter.check("user1").success).toBe(true);
      expect(limiter.check("user2").success).toBe(true);

      expect(limiter.check("user1").success).toBe(false);
      expect(limiter.check("user2").success).toBe(false);
    });

    it("resets after the window expires", () => {
      const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });

      expect(limiter.check("user1").success).toBe(true);
      expect(limiter.check("user1").success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60_001);

      expect(limiter.check("user1").success).toBe(true);
    });

    it("returns correct remaining count", () => {
      const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

      expect(limiter.check("user1").remaining).toBe(2);
      expect(limiter.check("user1").remaining).toBe(1);
      expect(limiter.check("user1").remaining).toBe(0);
    });

    it("sliding window allows new requests as old ones expire", () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 10_000 });

      // T=0: first request
      limiter.check("user1");

      // T=5s: second request
      vi.advanceTimersByTime(5_000);
      limiter.check("user1");

      // T=5s: third request — blocked
      expect(limiter.check("user1").success).toBe(false);

      // T=10.001s: first request expired, new one allowed
      vi.advanceTimersByTime(5_001);
      expect(limiter.check("user1").success).toBe(true);
    });
  });
});
