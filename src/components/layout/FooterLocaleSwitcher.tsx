"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Text-link variant of the locale switcher for the footer strip. The header's
// dropdown `LocaleSwitcher` is the primary entry point; this one exists
// because in footers users expect inline links — adding a dropdown there is
// both heavier visually and less discoverable.

// Language names are intentionally shown in their NATIVE form (not translated
// via next-intl) per UX convention and client spec Q1.3 — a visitor who
// doesn't read the current page's language must still recognize their own.
const LABELS: Record<string, string> = {
  es: "Español",
  ca: "Català",
  en: "English",
};

export function FooterLocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <nav aria-label={t("ariaLabel")} className="inline-flex items-center gap-1 text-sm">
      {routing.locales.map((locale, index) => {
        const isActive = locale === currentLocale;
        return (
          <span key={locale} className="inline-flex items-center">
            {index > 0 && (
              <span aria-hidden className="text-text-muted mx-1.5">
                |
              </span>
            )}
            <button
              type="button"
              disabled={isActive || isPending}
              onClick={() => {
                startTransition(() => {
                  // SAFETY: routing.locales produces the same union next-intl expects
                  router.replace(pathname, { locale: locale as "en" | "es" | "ca" });
                });
              }}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "focus-visible:outline-primary-500 rounded px-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                isActive
                  ? "text-text-primary cursor-default"
                  : "text-text-muted hover:text-primary-600"
              )}
            >
              {LABELS[locale] ?? locale.toUpperCase()}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
