// Cutoff = last wall-clock hour a speed can still be booked. Values live in
// admin_settings; this module is pure helpers + types.

export type DeliverySpeed = "standard" | "express" | "next_day";

export interface CutoffConfig {
  /** Hour (0–23) in `timezone` after which Next Day is hidden. */
  nextDayHourLocal: number;
  /** Hour (0–23) in `timezone` after which Express is hidden. */
  expressHourLocal: number;
  /** IANA timezone, e.g. "Europe/Madrid". */
  timezone: string;
}

/** Mirrors migration 00002 seeds; used when admin_settings fetch fails. */
export const DEFAULT_CUTOFF_CONFIG: CutoffConfig = {
  nextDayHourLocal: 18,
  expressHourLocal: 20,
  timezone: "Europe/Madrid",
};

function getHourInTimezone(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  // Some Node versions emit "24" at midnight — normalise to 0.
  const raw = hourPart ? Number.parseInt(hourPart.value, 10) : 0;
  return raw === 24 ? 0 : raw;
}

/** Standard is always available; express/next_day gate on cutoff hour. */
export function isSpeedAvailableNow(
  speed: DeliverySpeed,
  config: CutoffConfig,
  now: Date = new Date()
): boolean {
  if (speed === "standard") return true;
  const currentHour = getHourInTimezone(now, config.timezone);
  if (speed === "next_day") return currentHour < config.nextDayHourLocal;
  if (speed === "express") return currentHour < config.expressHourLocal;
  return false;
}

/** Convenience: filter a list of speeds down to those currently bookable. */
export function filterAvailableSpeeds(
  speeds: readonly DeliverySpeed[],
  config: CutoffConfig,
  now: Date = new Date()
): DeliverySpeed[] {
  return speeds.filter((s) => isSpeedAvailableNow(s, config, now));
}
