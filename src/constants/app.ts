export const APP_NAME = "Laveina";
export const APP_DESCRIPTION = "Smart Parcel Delivery — Shop to Shop";

export const DEFAULT_LOCALE = "es";
export const SUPPORTED_LOCALES = ["en", "es", "ca"] as const;

export const TRACKING_ID_PREFIX = "LAV";
export const TRACKING_ID_LENGTH = 12;

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;

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
