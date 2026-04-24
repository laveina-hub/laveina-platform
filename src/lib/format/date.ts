// Intl.DateTimeFormat-based — no date-fns dependency. Pass `timeZone`
// explicitly for Europe/Madrid wall-clock regardless of render origin.

import { routing } from "@/i18n/routing";

export type Locale = (typeof routing.locales)[number];

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

// Q18.2 — routing uses bare `en`, which most Intl runtimes alias to `en-US`
// (MM/DD/YYYY). Spec requires DD/MM/YYYY in every locale — remap `en` to
// `en-GB` at the formatter boundary so the Intl output matches the ES/CA
// numeric ordering without us having to hand-roll formats.
function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : locale;
}

/** DD/MM/YYYY across es/ca/en. Matches the on-screen format used throughout
 *  the booking + tracking flows. */
export function formatDateShort(input: DateInput, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDate(input));
}

/** Localised long form — "20 de abril de 2026" / "20 d'abril de 2026" /
 *  "20 April 2026". Used on receipts, invoices, and tracking timestamps. */
export function formatDateLong(input: DateInput, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDate(input));
}

/** DD/MM/YYYY · HH:mm — dashboard lists, admin tables, audit entries. */
export function formatDateTime(
  input: DateInput,
  locale: Locale,
  options: { timeZone?: string } = {}
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: options.timeZone,
  }).format(toDate(input));
}

/** "20 abr 2026" — denser than `formatDateLong` but more scannable than the
 *  numeric DD/MM short form. Used in shipment list rows and admin tables. */
export function formatDateMedium(input: DateInput, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(toDate(input));
}

/** "20 abr 2026, 14:30" — same density as `formatDateMedium` plus time;
 *  the dashboards use this on shipment detail + audit timelines. */
export function formatDateTimeMedium(
  input: DateInput,
  locale: Locale,
  options: { timeZone?: string } = {}
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: options.timeZone,
  }).format(toDate(input));
}

/** HH:mm — used in tracking ETAs and cutoff messaging. */
export function formatTime(
  input: DateInput,
  locale: Locale,
  options: { timeZone?: string } = {}
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: options.timeZone,
  }).format(toDate(input));
}

/** Relative phrasing — "hace 2 horas" / "fa 2 hores" / "2 hours ago".
 *  Used in the notifications feed, scan log lines, etc. */
export function formatRelative(input: DateInput, locale: Locale, now: Date = new Date()): string {
  const target = toDate(input);
  const diffMs = target.getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });

  const absSeconds = Math.abs(diffMs) / 1000;
  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSeconds < 60 * 60) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (absSeconds < 60 * 60 * 24) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (absSeconds < 60 * 60 * 24 * 30) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  if (absSeconds < 60 * 60 * 24 * 365)
    return rtf.format(Math.round(diffMs / (86_400_000 * 30)), "month");
  return rtf.format(Math.round(diffMs / (86_400_000 * 365)), "year");
}
