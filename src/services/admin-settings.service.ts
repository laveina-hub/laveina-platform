import { cache } from "react";

import { DEFAULT_CUTOFF_CONFIG, type CutoffConfig } from "@/constants/cutoff-times";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSettings = Record<string, string>;

// Process-level cache: survives across requests in the same warm function
// instance. React `cache()` only memoizes within a single request — without
// this layer every quote/dispatch hits admin_settings with a full table
// scan. Settings change rarely (admin UI only); 60s staleness is acceptable.
// Call `invalidateSettingsCache()` from any admin write path to force a refresh.
const CACHE_TTL_MS = 60_000;
type CachedSettings = { data: AdminSettings; expiresAt: number };
let processCache: CachedSettings | null = null;

async function fetchSettings(): Promise<AdminSettings> {
  const now = Date.now();
  if (processCache && processCache.expiresAt > now) {
    return processCache.data;
  }
  const supabase = createAdminClient();
  const { data } = await supabase.from("admin_settings").select("key, value");
  const result: AdminSettings = data
    ? Object.fromEntries(data.map((row) => [row.key, row.value]))
    : {};
  processCache = { data: result, expiresAt: now + CACHE_TTL_MS };
  return result;
}

/** Per-request-memoized flat key→value map. Server-only (admin client). */
export const getAllSettings = cache(fetchSettings);

/** Drop the process-level cache. Call after any admin_settings mutation. */
export function invalidateSettingsCache(): void {
  processCache = null;
}

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
