// Weight-based tier system. Customer enters dimensions + weight;
// system calculates billable weight and auto-assigns tier.

import type { ParcelSize } from "@/types/enums";

// ---------- Volumetric weight ----------

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

// ---------- Dimension validation ----------

export const MAX_WEIGHT_KG = 30;
export const MAX_TOTAL_DIMENSIONS_CM = 150;
export const MAX_LONGEST_SIDE_CM = 120;

export type DimensionValidationResult = { valid: true } | { valid: false; error: string };

export function validateParcelDimensions(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): DimensionValidationResult {
  const longestSide = Math.max(lengthCm, widthCm, heightCm);
  if (longestSide > MAX_LONGEST_SIDE_CM) {
    return { valid: false, error: "validation.longestSideExceeded" };
  }

  const total = lengthCm + widthCm + heightCm;
  if (total > MAX_TOTAL_DIMENSIONS_CM) {
    return { valid: false, error: "validation.totalDimensionsExceeded" };
  }

  return { valid: true };
}

// ---------- Weight tier definitions ----------

export type WeightTier = {
  size: ParcelSize;
  minWeightKg: number;
  maxWeightKg: number;
};

export const WEIGHT_TIERS: WeightTier[] = [
  { size: "tier_1", minWeightKg: 0, maxWeightKg: 2 },
  { size: "tier_2", minWeightKg: 2.01, maxWeightKg: 5 },
  { size: "tier_3", minWeightKg: 5.01, maxWeightKg: 10 },
  { size: "tier_4", minWeightKg: 10.01, maxWeightKg: 15 },
  { size: "tier_5", minWeightKg: 15.01, maxWeightKg: 20 },
  { size: "tier_6", minWeightKg: 20.01, maxWeightKg: 30 },
];

/**
 * Determine which weight tier a billable weight falls into.
 * Returns null if weight is out of range (≤0 or >30 kg).
 */
export function getTierForWeight(billableWeightKg: number): WeightTier | null {
  if (billableWeightKg <= 0 || billableWeightKg > MAX_WEIGHT_KG) return null;
  return WEIGHT_TIERS.find((t) => billableWeightKg <= t.maxWeightKg) ?? null;
}
