"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_NAMES: Record<string, { native: string; code: string }> = {
  en: { native: "English", code: "EN" },
  es: { native: "Espanol", code: "ES" },
  ca: { native: "Catala", code: "CA" },
};

/** Polished mobile/footer locale switcher — segmented control with sliding indicator feel. */
export function LocaleSwitcherMobile() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="radiogroup"
      aria-label={t("ariaLabel")}
      className="border-border-default bg-bg-secondary flex gap-0.5 rounded-xl border p-1"
    >
      {routing.locales.map((loc) => {
        const isActive = loc === locale;
        const config = LOCALE_NAMES[loc];
        return (
          <Link
            key={loc}
            href={pathname}
            locale={loc}
            scroll={false}
            role="radio"
            aria-checked={isActive}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 transition-all duration-200",
              isActive ? "bg-white shadow-sm" : "hover:bg-white/50"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold tracking-wider transition-all duration-200",
                isActive ? "bg-primary-500 scale-110 text-white" : "bg-bg-muted text-text-muted"
              )}
            >
              {config?.code ?? loc.toUpperCase()}
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold transition-colors",
                isActive ? "text-primary-700" : "text-text-muted"
              )}
            >
              {config?.native ?? t(loc)}
            </span>
            <span
              className={cn(
                "absolute -bottom-0.5 h-1 w-1 rounded-full transition-all duration-200",
                isActive ? "bg-primary-500 scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}
