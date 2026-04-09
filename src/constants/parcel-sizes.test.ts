import { describe, expect, it } from "vitest";

import {
  calcBillableWeightKg,
  calcVolumetricWeightKg,
  getTierForWeight,
  validateParcelDimensions,
  WEIGHT_TIERS,
  MAX_TOTAL_DIMENSIONS_CM,
  MAX_LONGEST_SIDE_CM,
  MAX_WEIGHT_KG,
} from "@/constants/parcel-sizes";

describe("parcel-sizes", () => {
  describe("calcVolumetricWeightKg", () => {
    it("calculates volumetric weight with divisor 6000", () => {
      expect(calcVolumetricWeightKg(50, 40, 30)).toBe(10);
    });

    it("returns 0 when any dimension is 0", () => {
      expect(calcVolumetricWeightKg(0, 40, 30)).toBe(0);
    });

    it("handles small parcels correctly", () => {
      expect(calcVolumetricWeightKg(30, 20, 20)).toBe(2);
    });

    it("handles large parcels correctly", () => {
      expect(calcVolumetricWeightKg(55, 60, 39)).toBe(21.45);
    });
  });

  describe("calcBillableWeightKg", () => {
    it("returns actual weight when greater than volumetric", () => {
      expect(calcBillableWeightKg(15, 50, 40, 30)).toBe(15);
    });

    it("returns volumetric weight when greater than actual", () => {
      expect(calcBillableWeightKg(2, 50, 40, 30)).toBe(10);
    });

    it("returns either when both are equal", () => {
      expect(calcBillableWeightKg(10, 50, 40, 30)).toBe(10);
    });

    it("uses actual weight for dense small parcels", () => {
      expect(calcBillableWeightKg(5, 10, 10, 10)).toBe(5);
    });

    it("uses volumetric weight for light large parcels", () => {
      expect(calcBillableWeightKg(0.5, 55, 55, 39)).toBe(19.6625);
    });
  });

  describe("validateParcelDimensions", () => {
    it("passes for normal dimensions", () => {
      expect(validateParcelDimensions(40, 30, 20).valid).toBe(true);
    });

    it("passes at exactly 150cm total", () => {
      expect(validateParcelDimensions(60, 50, 40).valid).toBe(true);
    });

    it("passes at exactly 120cm longest side", () => {
      expect(validateParcelDimensions(120, 15, 15).valid).toBe(true);
    });

    it("fails when total exceeds 150cm", () => {
      const result = validateParcelDimensions(60, 50, 41);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("validation.totalDimensionsExceeded");
      }
    });

    it("fails when longest side exceeds 120cm", () => {
      const result = validateParcelDimensions(121, 10, 10);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("validation.longestSideExceeded");
      }
    });

    it("checks longest side before total dimensions", () => {
      const result = validateParcelDimensions(121, 10, 10);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("validation.longestSideExceeded");
      }
    });
  });

  describe("WEIGHT_TIERS", () => {
    it("has 6 tiers defined", () => {
      expect(WEIGHT_TIERS).toHaveLength(6);
    });

    it("covers 0 to 30 kg without gaps", () => {
      expect(WEIGHT_TIERS[0].minWeightKg).toBe(0);
      expect(WEIGHT_TIERS[5].maxWeightKg).toBe(30);
    });

    it("has increasing weight ranges", () => {
      for (let i = 1; i < WEIGHT_TIERS.length; i++) {
        expect(WEIGHT_TIERS[i].minWeightKg).toBeGreaterThan(WEIGHT_TIERS[i - 1].minWeightKg);
        expect(WEIGHT_TIERS[i].maxWeightKg).toBeGreaterThan(WEIGHT_TIERS[i - 1].maxWeightKg);
      }
    });
  });

  describe("getTierForWeight", () => {
    it("returns tier_1 for 1 kg", () => {
      expect(getTierForWeight(1)?.size).toBe("tier_1");
    });

    it("returns tier_1 for exactly 2 kg", () => {
      expect(getTierForWeight(2)?.size).toBe("tier_1");
    });

    it("returns tier_2 for 2.5 kg", () => {
      expect(getTierForWeight(2.5)?.size).toBe("tier_2");
    });

    it("returns tier_3 for 7 kg", () => {
      expect(getTierForWeight(7)?.size).toBe("tier_3");
    });

    it("returns tier_4 for 12 kg", () => {
      expect(getTierForWeight(12)?.size).toBe("tier_4");
    });

    it("returns tier_5 for 18 kg", () => {
      expect(getTierForWeight(18)?.size).toBe("tier_5");
    });

    it("returns tier_6 for 25 kg", () => {
      expect(getTierForWeight(25)?.size).toBe("tier_6");
    });

    it("returns tier_6 for exactly 30 kg", () => {
      expect(getTierForWeight(30)?.size).toBe("tier_6");
    });

    it("returns null for 0 kg", () => {
      expect(getTierForWeight(0)).toBeNull();
    });

    it("returns null for negative weight", () => {
      expect(getTierForWeight(-1)).toBeNull();
    });

    it("returns null for weight above 30 kg", () => {
      expect(getTierForWeight(31)).toBeNull();
    });
  });

  describe("constants", () => {
    it("MAX_WEIGHT_KG is 30", () => {
      expect(MAX_WEIGHT_KG).toBe(30);
    });

    it("MAX_TOTAL_DIMENSIONS_CM is 150", () => {
      expect(MAX_TOTAL_DIMENSIONS_CM).toBe(150);
    });

    it("MAX_LONGEST_SIDE_CM is 120", () => {
      expect(MAX_LONGEST_SIDE_CM).toBe(120);
    });
  });
});
