import type { ParcelSize } from "@/types/enums";

const VOLUMETRIC_DIVISOR = 6000;

export function calcVolumetricWeightKg(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  return (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR;
}

export function calcBillableWeightKg(
  actualWeightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  const volumetric = calcVolumetricWeightKg(lengthCm, widthCm, heightCm);
  return Math.max(actualWeightKg, volumetric);
}

// Must match CHECK constraints in migration 00002 §1.3 — DB is the enforcer,
// UI duplicates for fail-fast validation.
export const MAX_WEIGHT_KG = 20;
export const MAX_TOTAL_DIMENSIONS_CM = 149;
export const MAX_LONGEST_SIDE_CM = 55;

export type DimensionValidationResult =
  | { valid: true }
  | { valid: false; error: string; values: Record<string, number> };

export function validateParcelDimensions(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): DimensionValidationResult {
  const longestSide = Math.max(lengthCm, widthCm, heightCm);
  if (longestSide > MAX_LONGEST_SIDE_CM) {
    return {
      valid: false,
      error: "validation.longestSideExceeded",
      values: { max: MAX_LONGEST_SIDE_CM },
    };
  }

  const total = lengthCm + widthCm + heightCm;
  if (total > MAX_TOTAL_DIMENSIONS_CM) {
    return {
      valid: false,
      error: "validation.totalDimensionsExceeded",
      values: { max: MAX_TOTAL_DIMENSIONS_CM },
    };
  }

  return { valid: true };
}

// ── M2 parcel preset types ─────────────────────────────────────────────────
// Rows come from parcel-preset.service.ts; these types give compile-time safety.

export type ParcelPresetSlug = "mini" | "small" | "medium" | "large";

export interface ParcelPreset {
  slug: ParcelPresetSlug;
  nameKey: string;
  exampleKey: string;
  minWeightKg: number;
  maxWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  displayOrder: number;
  isActive: boolean;
}

/** Pure helper — callers pass in the presets fetched from the service. */
export function findPresetForWeight(
  billableWeightKg: number,
  presets: readonly ParcelPreset[]
): ParcelPreset | null {
  if (billableWeightKg <= 0 || billableWeightKg > MAX_WEIGHT_KG) return null;
  return (
    presets
      .filter((p) => p.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .find((p) => billableWeightKg <= p.maxWeightKg) ?? null
  );
}

// ── Legacy 6-tier support ──────────────────────────────────────────────────
// Kept for historical shipment rows rendered by admin screens. Remove once
// Phase 3 migrates admin UI off the old parcel_size enum.

export type WeightTier = {
  size: ParcelSize;
  minWeightKg: number;
  maxWeightKg: number;
};

/** @deprecated Historical rendering only — M2 bookings use `ParcelPreset`. */
export const WEIGHT_TIERS: WeightTier[] = [
  { size: "tier_1", minWeightKg: 0, maxWeightKg: 2 },
  { size: "tier_2", minWeightKg: 2.01, maxWeightKg: 5 },
  { size: "tier_3", minWeightKg: 5.01, maxWeightKg: 10 },
  { size: "tier_4", minWeightKg: 10.01, maxWeightKg: 15 },
  { size: "tier_5", minWeightKg: 15.01, maxWeightKg: 20 },
  { size: "tier_6", minWeightKg: 20.01, maxWeightKg: 30 },
];

/**
 * @deprecated Historical rendering only — M2 bookings use `findPresetForWeight`.
 * Returns null if weight is out of legacy range (≤0 or >30 kg).
 */
export function getTierForWeight(billableWeightKg: number): WeightTier | null {
  if (billableWeightKg <= 0 || billableWeightKg > 30) return null;
  return WEIGHT_TIERS.find((t) => billableWeightKg <= t.maxWeightKg) ?? null;
}
