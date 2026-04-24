// Parses the JSONB `working_hours` column stored on `pickup_points` and returns
// a display string for "today". The shape is seeded by scripts/seed-pickup-points.js:
//
//   { monday: { open: true, slots: [["09:00", "14:00"], ["16:00", "20:00"]] }, ... }
//
// "Today" is resolved in the caller's local time unless a timeZone is passed;
// the booking flow uses Europe/Madrid for consistency with cutoff logic.

type DaySlot = [start: string, end: string];

export type WorkingHoursDay = {
  open: boolean;
  slots: DaySlot[];
};

export type WorkingHoursMap = Partial<Record<WeekdayKey, WorkingHoursDay>>;

type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const WEEKDAY_ORDER: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getTodayWeekdayKey(now: Date = new Date(), timeZone = "Europe/Madrid"): WeekdayKey {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "monday";
  return (WEEKDAY_ORDER as string[]).includes(weekday) ? (weekday as WeekdayKey) : "monday";
}

/** First open slot for today, or null if the shop is closed / data missing.
 *  The M2 design only shows one slot per card; if the shop has split hours
 *  (e.g. 09–14 + 16–20) we show the morning block and expose the rest via
 *  the detailed pickup-point view in Step 3. */
export function getTodayPrimarySlot(workingHours: unknown, now: Date = new Date()): DaySlot | null {
  if (!workingHours || typeof workingHours !== "object") return null;
  const map = workingHours as WorkingHoursMap;
  const today = getTodayWeekdayKey(now);
  const entry = map[today];
  if (!entry || !entry.open || entry.slots.length === 0) return null;
  const first = entry.slots[0];
  if (!Array.isArray(first) || first.length < 2) return null;
  return [first[0], first[1]];
}

function parseSlotMinute(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getCurrentMinute(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = Number.parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

/** True if current local time falls within any of today's slots. */
export function isOpenNow(
  workingHours: unknown,
  now: Date = new Date(),
  timeZone = "Europe/Madrid"
): boolean {
  if (!workingHours || typeof workingHours !== "object") return false;
  const map = workingHours as WorkingHoursMap;
  const today = getTodayWeekdayKey(now, timeZone);
  const entry = map[today];
  if (!entry || !entry.open || entry.slots.length === 0) return false;

  const currentMinute = getCurrentMinute(now, timeZone);

  for (const slot of entry.slots) {
    if (!Array.isArray(slot) || slot.length < 2) continue;
    const start = parseSlotMinute(slot[0]);
    const end = parseSlotMinute(slot[1]);
    if (start === null || end === null) continue;
    if (currentMinute >= start && currentMinute < end) return true;
  }
  return false;
}

/**
 * Q3.5 — when the pickup point is currently open, returns the end time of the
 * active slot (e.g. "20:00") so the card can render "Open now · Closes at 20:00".
 * Returns null when the point is closed, data is missing, or the time string
 * is malformed.
 */
export function getCurrentClosingTime(
  workingHours: unknown,
  now: Date = new Date(),
  timeZone = "Europe/Madrid"
): string | null {
  if (!workingHours || typeof workingHours !== "object") return null;
  const map = workingHours as WorkingHoursMap;
  const today = getTodayWeekdayKey(now, timeZone);
  const entry = map[today];
  if (!entry || !entry.open || entry.slots.length === 0) return null;

  const currentMinute = getCurrentMinute(now, timeZone);

  for (const slot of entry.slots) {
    if (!Array.isArray(slot) || slot.length < 2) continue;
    const start = parseSlotMinute(slot[0]);
    const end = parseSlotMinute(slot[1]);
    if (start === null || end === null) continue;
    if (currentMinute >= start && currentMinute < end) return slot[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// A6 (client answer 2026-04-21): temporarily-closed pickup points.
// `pickup_point_overrides` rows are active when now is inside [starts_at, ends_at)
// (ends_at NULL = indefinite). The Step 2 card shows a "Temporarily Closed"
// badge and a confirm-dialog before we commit selection.
// ---------------------------------------------------------------------------

export type PickupPointOverride = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  reason: string | null;
};

/**
 * Returns the first active override for a pickup point, or null. Pure function
 * so it's safe on server + client; call sites supply `now` in tests.
 */
export function getActiveOverride(
  overrides: PickupPointOverride[] | null | undefined,
  now: Date = new Date()
): PickupPointOverride | null {
  if (!overrides || overrides.length === 0) return null;
  const ms = now.getTime();

  for (const override of overrides) {
    const start = Date.parse(override.starts_at);
    if (Number.isNaN(start) || start > ms) continue;
    if (override.ends_at !== null) {
      const end = Date.parse(override.ends_at);
      if (Number.isNaN(end) || end <= ms) continue;
    }
    return override;
  }
  return null;
}
