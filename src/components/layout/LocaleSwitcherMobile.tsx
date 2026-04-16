"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_CODES: Record<string, string> = {
  en: "EN",
  es: "ES",
  ca: "CA",
};

export function LocaleSwitcherMobile() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t("ariaLabel")}
      className={cn(
        "border-border-default bg-bg-secondary flex gap-0.5 rounded-xl border p-1 transition-opacity",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      {routing.locales.map((loc) => {
        const isActive = loc === locale;
        const code = LOCALE_CODES[loc];
        return (
          <button
            key={loc}
            type="button"
            onClick={() => {
              startTransition(() => {
                router.replace({ pathname }, { locale: loc });
              });
            }}
            role="radio"
            aria-checked={isActive}
            disabled={isPending}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 transition-all duration-200",
              isActive ? "bg-white shadow-sm" : "hover:bg-white/50"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tracking-wider transition-all duration-200",
                isActive ? "bg-primary-500 scale-110 text-white" : "bg-bg-muted text-text-muted"
              )}
            >
              {code ?? loc.toUpperCase()}
            </span>
            <span
              className={cn(
                "text-xs font-semibold transition-colors",
                isActive ? "text-primary-700" : "text-text-muted"
              )}
            >
              {t(loc)}
            </span>
            <span
              className={cn(
                "absolute -bottom-0.5 h-1 w-1 rounded-full transition-all duration-200",
                isActive ? "bg-primary-500 scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
