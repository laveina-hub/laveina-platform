import { cache } from "react";

import { DEFAULT_CUTOFF_CONFIG, type CutoffConfig } from "@/constants/cutoff-times";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSettings = Record<string, string>;

/** Per-request-memoized flat key→value map. Server-only (admin client). */
export const getAllSettings = cache(async (): Promise<AdminSettings> => {
  const supabase = createAdminClient();
  const { data } = await supabase.from("admin_settings").select("key, value");
  if (!data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
});

export function getSettingNumber(settings: AdminSettings, key: string, fallback: number): number {
  const raw = settings[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function getSettingString(settings: AdminSettings, key: string, fallback: string): string {
  const raw = settings[key];
  return raw ?? fallback;
}

/** Falls back to DEFAULT_CUTOFF_CONFIG on missing/malformed rows. */
export const getCutoffConfig = cache(async (): Promise<CutoffConfig> => {
  const settings = await getAllSettings();
  return {
    nextDayHourLocal: getSettingNumber(
      settings,
      "cutoff_next_day_hour_local",
      DEFAULT_CUTOFF_CONFIG.nextDayHourLocal
    ),
    expressHourLocal: getSettingNumber(
      settings,
      "cutoff_express_hour_local",
      DEFAULT_CUTOFF_CONFIG.expressHourLocal
    ),
    timezone: getSettingString(settings, "cutoff_timezone", DEFAULT_CUTOFF_CONFIG.timezone),
  };
});
