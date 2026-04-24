export const APP_NAME = "Laveina";
export const APP_DESCRIPTION = "Smart Parcel Delivery — Shop to Shop";

export const DEFAULT_LOCALE = "es";
export const SUPPORTED_LOCALES = ["en", "es", "ca"] as const;

export const TRACKING_ID_PREFIX = "LAV";
export const TRACKING_ID_LENGTH = 12;

export const OTP_LENGTH = 6;
// M2: expiry extended from 10 min → 24 h per Q12.4. Security trade-off
// documented in README/M2_EXECUTION_PLAN.md (S3.4).
export const OTP_EXPIRY_HOURS = 24;
/** @deprecated Use OTP_EXPIRY_HOURS. Kept temporarily for callers that have
 *  not yet migrated; will be removed when the pre-M2 flow is retired. */
export const OTP_EXPIRY_MINUTES = OTP_EXPIRY_HOURS * 60;

export const PAGINATION_DEFAULT_PAGE_SIZE = 20;
export const PAGINATION_MAX_PAGE_SIZE = 100;

export const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin",
  pickup_point: "/pickup-point",
  customer: "/customer",
};

export function getLocalePrefix(locale: string, defaultLocale: string): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}
