// All monetary values are stored as integer cents. Use these helpers for
// display — never inline `(cents / 100).toFixed(2)`.

import type { Locale } from "./date";

/** "€X.XX" short form — locale-agnostic, used in tables / rows / badges. */
export function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** Locale-aware ("4,95 €" in es/ca vs "€4.95" in en) — use on receipts. */
export function formatCurrency(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
