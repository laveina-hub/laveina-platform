// Stateless parcel-size math. DB values (parcel_size_config) take precedence at runtime.

import type { ParcelSize } from "@/types/enums";

const VOLUMETRIC_DIVISOR = 5000;

export function calcVolumetricWeightKg(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  return (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR;
}

/** Billable weight = max(actual, volumetric). Used for pricing. */
export function calcBillableWeightKg(
  actualWeightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  const volumetric = calcVolumetricWeightKg(lengthCm, widthCm, heightCm);
  return Math.max(actualWeightKg, volumetric);
}

// Fallbacks until parcel_size_config loads from DB

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
