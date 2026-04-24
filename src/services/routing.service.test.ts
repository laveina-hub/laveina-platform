import { describe, expect, it } from "vitest";

import {
  getDeliveryMode,
  isBarcelonaRoute,
  isInternalRoute,
  isSendcloudRoute,
} from "@/services/routing.service";

describe("routing.service", () => {
  describe("getDeliveryMode", () => {
    it("returns internal when both postcodes start with 08", () => {
      const result = getDeliveryMode("08001", "08036");
      expect(result.mode).toBe("internal");
    });

    it("returns internal for Barcelona province postcodes (08xxx)", () => {
      const result = getDeliveryMode("08800", "08910");
      expect(result.mode).toBe("internal");
    });

    it("returns sendcloud when origin is Barcelona but destination is not", () => {
      const result = getDeliveryMode("08001", "28001");
      expect(result.mode).toBe("sendcloud");
    });

    it("returns sendcloud when destination is Barcelona but origin is not", () => {
      const result = getDeliveryMode("28001", "08036");
      expect(result.mode).toBe("sendcloud");
    });

    it("returns sendcloud when neither is Barcelona", () => {
      const result = getDeliveryMode("28001", "41001");
      expect(result.mode).toBe("sendcloud");
    });

    it("returns blocked for invalid origin postcode (too short)", () => {
      const result = getDeliveryMode("0800", "08036");
      expect(result.mode).toBe("blocked");
      if (result.mode === "blocked") {
        expect(result.reason).toContain("Origin");
      }
    });

    it("returns blocked for invalid destination postcode (too long)", () => {
      const result = getDeliveryMode("08001", "080361");
      expect(result.mode).toBe("blocked");
      if (result.mode === "blocked") {
        expect(result.reason).toContain("Destination");
      }
    });

    it("returns blocked for non-numeric postcodes", () => {
      const result = getDeliveryMode("ABCDE", "08001");
      expect(result.mode).toBe("blocked");
    });

    it("returns blocked for empty strings", () => {
      const result = getDeliveryMode("", "08001");
      expect(result.mode).toBe("blocked");
    });

    it("handles edge case: postcode 08000", () => {
      const result = getDeliveryMode("08000", "08999");
      expect(result.mode).toBe("internal");
    });

    it("handles postcodes starting with 080 specifically", () => {
      const result = getDeliveryMode("08001", "08099");
      expect(result.mode).toBe("internal");
    });
  });

  describe("isInternalRoute", () => {
    it("returns true for internal routes", () => {
      const result = getDeliveryMode("08001", "08036");
      expect(isInternalRoute(result)).toBe(true);
    });

    it("returns false for sendcloud routes", () => {
      const result = getDeliveryMode("08001", "28001");
      expect(isInternalRoute(result)).toBe(false);
    });

    it("returns false for blocked routes", () => {
      const result = getDeliveryMode("", "08001");
      expect(isInternalRoute(result)).toBe(false);
    });
  });

  describe("isSendcloudRoute", () => {
    it("returns true for sendcloud routes", () => {
      const result = getDeliveryMode("08001", "28001");
      expect(isSendcloudRoute(result)).toBe(true);
    });

    it("returns false for internal routes", () => {
      const result = getDeliveryMode("08001", "08036");
      expect(isSendcloudRoute(result)).toBe(false);
    });
  });

  describe("isBarcelonaRoute", () => {
    it("returns true when both postcodes start with 08", () => {
      expect(isBarcelonaRoute("08001", "08036")).toBe(true);
      expect(isBarcelonaRoute("08800", "08910")).toBe(true);
    });

    it("returns false when only origin is Barcelona", () => {
      expect(isBarcelonaRoute("08001", "28001")).toBe(false);
    });

    it("returns false when only destination is Barcelona", () => {
      expect(isBarcelonaRoute("28001", "08001")).toBe(false);
    });

    it("returns false when neither is Barcelona", () => {
      expect(isBarcelonaRoute("28001", "41001")).toBe(false);
    });

    it("returns false for invalid / partial postcodes", () => {
      expect(isBarcelonaRoute("0800", "08001")).toBe(false);
      expect(isBarcelonaRoute("08001", "080361")).toBe(false);
      expect(isBarcelonaRoute("", "08001")).toBe(false);
      expect(isBarcelonaRoute("ABCDE", "08001")).toBe(false);
    });
  });
});
