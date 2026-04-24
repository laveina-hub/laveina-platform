// Q11.4 — coarse ETA computation from `created_at + delivery_speed`.
// Returns a half-open [from, to) window the UI can render as a single date
// or a date-range. Pure functions, no Intl side effects — formatting lives
// next to the caller so the locale flows down explicitly.
//
// Speed → window mapping mirrors the homepage subline ("48–72h across Spain
// · Next Day in Barcelona") and the cutoff config used at booking time:
//
//   next_day  → +1 day, single date
//   express   → +2 days, single date (target = "by end of day +2")
//   standard  → +2 to +3 days, range
//
// Caller passes `now` for testability; default uses the current clock.

import type { Locale } from "@/lib/format";

export type DeliverySpeed = "standard" | "express" | "next_day";

export type EtaRange = {
  from: Date;
  to: Date;
};

const ONE_DAY_MS = 86_400_000;

function addDays(input: Date, days: number): Date {
  return new Date(input.getTime() + days * ONE_DAY_MS);
}

export function computeEta(createdAt: Date | string, speed: DeliverySpeed | null): EtaRange | null {
  if (!speed) return null;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;

  switch (speed) {
    case "next_day":
      return { from: addDays(created, 1), to: addDays(created, 1) };
    case "express":
      return { from: addDays(created, 2), to: addDays(created, 2) };
    case "standard":
      return { from: addDays(created, 2), to: addDays(created, 3) };
  }
}

/** "Wed 22 Apr" / "Mié 22 abr" / "Dc 22 d'abr." (locale-driven). */
function formatEtaDay(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Madrid",
  }).format(date);
}

/** Renders "Wed 22 Apr" for a single-day ETA or "Wed 22 – Thu 23 Apr" for a
 *  range. Returns null when the ETA can't be computed (unknown speed). */
export function formatEtaRange(eta: EtaRange | null, locale: Locale): string | null {
  if (!eta) return null;
  const fromLabel = formatEtaDay(eta.from, locale);
  if (eta.from.getTime() === eta.to.getTime()) return fromLabel;
  const toLabel = formatEtaDay(eta.to, locale);
  return `${fromLabel} – ${toLabel}`;
}

/** Same day in Europe/Madrid? Guards the "tomorrow" detection in
 *  `resolveEtaDisplay` so "before 18:00 tomorrow" only shows when the ETA
 *  date is literally the day after `now` in the operator's timezone. */
function isSameMadridDay(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return fmt.format(a) === fmt.format(b);
}

export type EtaDisplay =
  /** "Arrives Wed 19 – Thu 20 Apr" — standard speed */
  | { kind: "range"; fromLabel: string; toLabel: string }
  /** "Arrives before 18:00, Wed 19 Apr" — express / next_day (non-tomorrow) */
  | { kind: "before18Date"; dateLabel: string }
  /** "Arrives before 18:00 tomorrow" — next_day when target is tomorrow */
  | { kind: "before18Tomorrow" };

/**
 * Q11.4 — maps a computed ETA + the delivery speed to a typed display shape.
 * Callers pick the matching i18n key per `kind` so the rendered string stays
 * locale-safe ("before 18:00" is hardcoded in the key, date formatted via
 * Intl). `now` is injected for tests; defaults to the current clock.
 */
export function resolveEtaDisplay(
  eta: EtaRange | null,
  speed: DeliverySpeed | null,
  locale: Locale,
  now: Date = new Date()
): EtaDisplay | null {
  if (!eta || !speed) return null;

  if (speed === "standard") {
    const fromLabel = formatEtaDay(eta.from, locale);
    if (eta.from.getTime() === eta.to.getTime()) {
      // Shouldn't happen for standard (range of 2 days), but guard anyway.
      return { kind: "before18Date", dateLabel: fromLabel };
    }
    return {
      kind: "range",
      fromLabel,
      toLabel: formatEtaDay(eta.to, locale),
    };
  }

  // express / next_day share the "before 18:00" format. Next Day also gets
  // the shorthand "tomorrow" when the target is the day after now.
  const tomorrow = new Date(now.getTime() + ONE_DAY_MS);
  if (speed === "next_day" && isSameMadridDay(eta.from, tomorrow)) {
    return { kind: "before18Tomorrow" };
  }
  return { kind: "before18Date", dateLabel: formatEtaDay(eta.from, locale) };
}
