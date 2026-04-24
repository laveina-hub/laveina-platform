import { describe, expect, it } from "vitest";

import {
  calcBillableWeightKg,
  calcVolumetricWeightKg,
  findPresetForWeight,
  getTierForWeight,
  MAX_LONGEST_SIDE_CM,
  MAX_TOTAL_DIMENSIONS_CM,
  MAX_WEIGHT_KG,
  validateParcelDimensions,
  WEIGHT_TIERS,
  type ParcelPreset,
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
  });

  describe("validateParcelDimensions", () => {
    it("passes for normal dimensions", () => {
      expect(validateParcelDimensions(40, 30, 20).valid).toBe(true);
    });

    it("passes at exactly the max total (149cm)", () => {
      expect(validateParcelDimensions(55, 55, 39).valid).toBe(true);
    });

    it("passes at exactly the max longest side (55cm)", () => {
      expect(validateParcelDimensions(55, 30, 30).valid).toBe(true);
    });

    it("fails when total exceeds 149cm", () => {
      const result = validateParcelDimensions(50, 50, 50);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("validation.totalDimensionsExceeded");
        // Error surfaces the actual cap so the UI can interpolate `{max}`
        // without drifting from the constant.
        expect(result.values).toEqual({ max: 149 });
      }
    });

    it("fails when longest side exceeds 55cm", () => {
      const result = validateParcelDimensions(56, 10, 10);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("validation.longestSideExceeded");
        expect(result.values).toEqual({ max: 55 });
      }
    });

    it("checks longest side before total dimensions", () => {
      const result = validateParcelDimensions(80, 10, 10);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe("validation.longestSideExceeded");
      }
    });
  });

  describe("constants", () => {
    it("MAX_WEIGHT_KG is 20 (M2)", () => {
      expect(MAX_WEIGHT_KG).toBe(20);
    });

    it("MAX_TOTAL_DIMENSIONS_CM is 149 (M2)", () => {
      expect(MAX_TOTAL_DIMENSIONS_CM).toBe(149);
    });

    it("MAX_LONGEST_SIDE_CM is 55 (M2)", () => {
      expect(MAX_LONGEST_SIDE_CM).toBe(55);
    });
  });

  describe("findPresetForWeight", () => {
    const PRESETS: ParcelPreset[] = [
      {
        slug: "mini",
        nameKey: "parcelPresets.mini.name",
        exampleKey: "parcelPresets.mini.example",
        minWeightKg: 0,
        maxWeightKg: 2,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 20,
        displayOrder: 1,
        isActive: true,
      },
      {
        slug: "small",
        nameKey: "parcelPresets.small.name",
        exampleKey: "parcelPresets.small.example",
        minWeightKg: 2,
        maxWeightKg: 5,
        lengthCm: 35,
        widthCm: 35,
        heightCm: 24,
        displayOrder: 2,
        isActive: true,
      },
      {
        slug: "medium",
        nameKey: "parcelPresets.medium.name",
        exampleKey: "parcelPresets.medium.example",
        minWeightKg: 5,
        maxWeightKg: 10,
        lengthCm: 40,
        widthCm: 40,
        heightCm: 37,
        displayOrder: 3,
        isActive: true,
      },
      {
        slug: "large",
        nameKey: "parcelPresets.large.name",
        exampleKey: "parcelPresets.large.example",
        minWeightKg: 10,
        maxWeightKg: 20,
        lengthCm: 55,
        widthCm: 55,
        heightCm: 39,
        displayOrder: 4,
        isActive: true,
      },
    ];

    it("returns mini for 1 kg", () => {
      expect(findPresetForWeight(1, PRESETS)?.slug).toBe("mini");
    });

    it("returns mini for exactly 2 kg (inclusive upper bound)", () => {
      expect(findPresetForWeight(2, PRESETS)?.slug).toBe("mini");
    });

    it("returns small for 2.5 kg", () => {
      expect(findPresetForWeight(2.5, PRESETS)?.slug).toBe("small");
    });

    it("returns medium for 7 kg", () => {
      expect(findPresetForWeight(7, PRESETS)?.slug).toBe("medium");
    });

    it("returns large for 15 kg", () => {
      expect(findPresetForWeight(15, PRESETS)?.slug).toBe("large");
    });

    it("returns large for exactly 20 kg (M2 ceiling)", () => {
      expect(findPresetForWeight(20, PRESETS)?.slug).toBe("large");
    });

    it("returns null for 0 kg", () => {
      expect(findPresetForWeight(0, PRESETS)).toBeNull();
    });

    it("returns null for negative weight", () => {
      expect(findPresetForWeight(-1, PRESETS)).toBeNull();
    });

    it("returns null for weight above M2 ceiling", () => {
      expect(findPresetForWeight(21, PRESETS)).toBeNull();
    });

    it("skips inactive presets", () => {
      const withInactive = PRESETS.map((p) => (p.slug === "small" ? { ...p, isActive: false } : p));
      expect(findPresetForWeight(3, withInactive)?.slug).toBe("medium");
    });
  });

  describe("legacy tiers (pre-M2 support)", () => {
    it("WEIGHT_TIERS still exposes 6 legacy tiers", () => {
      expect(WEIGHT_TIERS).toHaveLength(6);
    });

    it("getTierForWeight returns legacy tier_6 for 25 kg", () => {
      expect(getTierForWeight(25)?.size).toBe("tier_6");
    });

    it("getTierForWeight returns null above 30 kg", () => {
      expect(getTierForWeight(31)).toBeNull();
    });
  });
});
