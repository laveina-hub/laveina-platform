// ─── Parcel size pure-math utilities ─────────────────────────────────────────
// Dimensions and max weights come from the DB (parcel_size_config table).
// This file contains only stateless calculations and compile-time fallbacks
// used when the DB data has not yet loaded (e.g., during SSR hydration).

import type { ParcelSize } from "@/types/enums";

// ─── Volumetric divisor ───────────────────────────────────────────────────────
// Standard carrier volumetric-weight divisor (cm³ → kg).
// SendCloud uses 5000; internal routes apply the same formula for consistency.

const VOLUMETRIC_DIVISOR = 5000;

/**
 * Calculates volumetric weight from physical dimensions.
 * Formula: (L × W × H) / 5000
 */
export function calcVolumetricWeightKg(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  return (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR;
}

/**
 * Returns the billable weight: whichever is greater, actual or volumetric.
 * This is the weight used for all pricing calculations.
 */
export function calcBillableWeightKg(
  actualWeightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  const volumetric = calcVolumetricWeightKg(lengthCm, widthCm, heightCm);
  return Math.max(actualWeightKg, volumetric);
}

// ─── Fallback defaults ────────────────────────────────────────────────────────
// Used only when parcel_size_config rows have not yet loaded from the DB.
// Admin-editable values in the DB take precedence over these at runtime.

export type ParcelSizeFallback = {
  maxWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export const PARCEL_SIZE_FALLBACKS: Record<ParcelSize, ParcelSizeFallback> = {
  small: { maxWeightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 20 },
  medium: { maxWeightKg: 5, lengthCm: 35, widthCm: 35, heightCm: 24 },
  large: { maxWeightKg: 10, lengthCm: 40, widthCm: 40, heightCm: 37 },
  extra_large: { maxWeightKg: 20, lengthCm: 55, widthCm: 55, heightCm: 39 },
  xxl: { maxWeightKg: 25, lengthCm: 60, widthCm: 60, heightCm: 45 },
};
