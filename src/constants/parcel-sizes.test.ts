import { describe, expect, it } from "vitest";

import {
  calcBillableWeightKg,
  calcVolumetricWeightKg,
  PARCEL_SIZE_FALLBACKS,
} from "@/constants/parcel-sizes";

describe("parcel-sizes", () => {
  describe("calcVolumetricWeightKg", () => {
    it("calculates volumetric weight with divisor 5000", () => {
      expect(calcVolumetricWeightKg(50, 40, 30)).toBe(12);
    });

    it("returns 0 when any dimension is 0", () => {
      expect(calcVolumetricWeightKg(0, 40, 30)).toBe(0);
    });

    it("handles small parcels correctly", () => {
      expect(calcVolumetricWeightKg(30, 20, 20)).toBe(2.4);
    });

    it("handles XXL parcels correctly", () => {
      expect(calcVolumetricWeightKg(55, 60, 39)).toBe(25.74);
    });
  });

  describe("calcBillableWeightKg", () => {
    it("returns actual weight when greater than volumetric", () => {
      expect(calcBillableWeightKg(15, 50, 40, 30)).toBe(15);
    });

    it("returns volumetric weight when greater than actual", () => {
      expect(calcBillableWeightKg(2, 50, 40, 30)).toBe(12);
    });

    it("returns either when both are equal", () => {
      expect(calcBillableWeightKg(12, 50, 40, 30)).toBe(12);
    });

    it("uses actual weight for dense small parcels", () => {
      expect(calcBillableWeightKg(5, 10, 10, 10)).toBe(5);
    });

    it("uses volumetric weight for light large parcels", () => {
      expect(calcBillableWeightKg(0.5, 55, 55, 39)).toBe(23.595);
    });
  });

  describe("PARCEL_SIZE_FALLBACKS", () => {
    it("has all 5 sizes defined", () => {
      expect(Object.keys(PARCEL_SIZE_FALLBACKS)).toHaveLength(5);
      expect(PARCEL_SIZE_FALLBACKS).toHaveProperty("small");
      expect(PARCEL_SIZE_FALLBACKS).toHaveProperty("medium");
      expect(PARCEL_SIZE_FALLBACKS).toHaveProperty("large");
      expect(PARCEL_SIZE_FALLBACKS).toHaveProperty("extra_large");
      expect(PARCEL_SIZE_FALLBACKS).toHaveProperty("xxl");
    });

    it("has increasing max weights", () => {
      const weights = [
        PARCEL_SIZE_FALLBACKS.small.maxWeightKg,
        PARCEL_SIZE_FALLBACKS.medium.maxWeightKg,
        PARCEL_SIZE_FALLBACKS.large.maxWeightKg,
        PARCEL_SIZE_FALLBACKS.extra_large.maxWeightKg,
        PARCEL_SIZE_FALLBACKS.xxl.maxWeightKg,
      ];

      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeGreaterThan(weights[i - 1]);
      }
    });

    it("XXL max weight is 25 kg", () => {
      expect(PARCEL_SIZE_FALLBACKS.xxl.maxWeightKg).toBe(25);
    });

    it("all dimensions are positive numbers", () => {
      for (const size of Object.values(PARCEL_SIZE_FALLBACKS)) {
        expect(size.lengthCm).toBeGreaterThan(0);
        expect(size.widthCm).toBeGreaterThan(0);
        expect(size.heightCm).toBeGreaterThan(0);
        expect(size.maxWeightKg).toBeGreaterThan(0);
      }
    });
  });
});
