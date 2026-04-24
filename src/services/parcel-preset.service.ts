import { cache } from "react";

import type { ParcelPreset, ParcelPresetSlug } from "@/constants/parcel-sizes";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";

type ParcelPresetRow = {
  slug: string;
  name_key: string;
  example_key: string;
  min_weight_kg: number;
  max_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  display_order: number;
  is_active: boolean;
};

function rowToPreset(row: ParcelPresetRow): ParcelPreset {
  return {
    // SAFETY: slug is TEXT in DB but seed + admin-only RLS constrain values
    // to the four known slugs.
    slug: row.slug as ParcelPresetSlug,
    nameKey: row.name_key,
    exampleKey: row.example_key,
    minWeightKg: Number(row.min_weight_kg),
    maxWeightKg: Number(row.max_weight_kg),
    lengthCm: Number(row.length_cm),
    widthCm: Number(row.width_cm),
    heightCm: Number(row.height_cm),
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

const COLUMNS =
  "slug, name_key, example_key, min_weight_kg, max_weight_kg, length_cm, width_cm, height_cm, display_order, is_active";

/** Per-request-memoized via React cache() so repeat callers share one query. */
export const listActivePresets = cache(async (): Promise<ApiResponse<ParcelPreset[]>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcel_presets")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: (data ?? []).map(rowToPreset), error: null };
});

export async function getPresetBySlug(slug: ParcelPresetSlug): Promise<ApiResponse<ParcelPreset>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcel_presets")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }
  if (!data) {
    return { data: null, error: { message: "Parcel preset not found", status: 404 } };
  }

  return { data: rowToPreset(data), error: null };
}
