import { describe, expect, it } from "vitest";

import {
  DEFAULT_CUTOFF_CONFIG,
  filterAvailableSpeeds,
  isSpeedAvailableNow,
  type CutoffConfig,
} from "@/constants/cutoff-times";

const MADRID: CutoffConfig = {
  nextDayHourLocal: 18,
  expressHourLocal: 20,
  timezone: "Europe/Madrid",
};

// Helper: build a UTC date that lands on a given Madrid hour in winter (UTC+1).
// We use December to avoid DST edge cases and assert the TZ conversion works.
function madridWinterDate(hour: number): Date {
  // Madrid CET = UTC+1. So Madrid 18:00 = UTC 17:00.
  return new Date(Date.UTC(2026, 11, 15, hour - 1, 0, 0));
}

describe("cutoff-times", () => {
  describe("isSpeedAvailableNow", () => {
    it("standard is always available", () => {
      expect(isSpeedAvailableNow("standard", MADRID, madridWinterDate(3))).toBe(true);
      expect(isSpeedAvailableNow("standard", MADRID, madridWinterDate(23))).toBe(true);
    });

    it("next_day is available before 18:00 Madrid", () => {
      expect(isSpeedAvailableNow("next_day", MADRID, madridWinterDate(10))).toBe(true);
      expect(isSpeedAvailableNow("next_day", MADRID, madridWinterDate(17))).toBe(true);
    });

    it("next_day is hidden at and after 18:00 Madrid", () => {
      expect(isSpeedAvailableNow("next_day", MADRID, madridWinterDate(18))).toBe(false);
      expect(isSpeedAvailableNow("next_day", MADRID, madridWinterDate(22))).toBe(false);
    });

    it("express is available before 20:00 Madrid", () => {
      expect(isSpeedAvailableNow("express", MADRID, madridWinterDate(19))).toBe(true);
    });

    it("express is hidden at and after 20:00 Madrid", () => {
      expect(isSpeedAvailableNow("express", MADRID, madridWinterDate(20))).toBe(false);
      expect(isSpeedAvailableNow("express", MADRID, madridWinterDate(23))).toBe(false);
    });

    it("window resets at local midnight", () => {
      expect(isSpeedAvailableNow("next_day", MADRID, madridWinterDate(0))).toBe(true);
      expect(isSpeedAvailableNow("express", MADRID, madridWinterDate(0))).toBe(true);
    });
  });

  describe("filterAvailableSpeeds", () => {
    it("returns all three at 10:00 Madrid", () => {
      const result = filterAvailableSpeeds(
        ["standard", "express", "next_day"],
        MADRID,
        madridWinterDate(10)
      );
      expect(result).toEqual(["standard", "express", "next_day"]);
    });

    it("drops next_day at 19:00 Madrid", () => {
      const result = filterAvailableSpeeds(
        ["standard", "express", "next_day"],
        MADRID,
        madridWinterDate(19)
      );
      expect(result).toEqual(["standard", "express"]);
    });

    it("drops express and next_day at 21:00 Madrid", () => {
      const result = filterAvailableSpeeds(
        ["standard", "express", "next_day"],
        MADRID,
        madridWinterDate(21)
      );
      expect(result).toEqual(["standard"]);
    });
  });

  describe("DEFAULT_CUTOFF_CONFIG", () => {
    it("matches the values seeded in migration 00002", () => {
      expect(DEFAULT_CUTOFF_CONFIG.nextDayHourLocal).toBe(18);
      expect(DEFAULT_CUTOFF_CONFIG.expressHourLocal).toBe(20);
      expect(DEFAULT_CUTOFF_CONFIG.timezone).toBe("Europe/Madrid");
    });
  });
});
