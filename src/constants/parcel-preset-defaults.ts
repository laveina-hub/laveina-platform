import type { ParcelPreset } from "@/constants/parcel-sizes";

// Shadow of migration 00002 seeds. MUST stay in sync with the migration;
// admin edits in the dashboard win at runtime — this only serves as a
// fallback when the DB returns empty (pre-migration or row deleted).

export const DEFAULT_PARCEL_PRESETS: ParcelPreset[] = [
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

// Barcelona internal prices (cents, IVA-inclusive) — mirrors 00002 §1.5.
export const DEFAULT_BCN_PRICES_CENTS: Record<
  "mini" | "small" | "medium" | "large",
  { standard: number; express: number; next_day: number }
> = {
  mini: { standard: 395, express: 690, next_day: 890 },
  small: { standard: 495, express: 790, next_day: 990 },
  medium: { standard: 595, express: 890, next_day: 1090 },
  large: { standard: 795, express: 1090, next_day: 1290 },
};
