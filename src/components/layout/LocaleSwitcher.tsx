"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_CONFIG: Record<string, { flag: string; label: string }> = {
  en: { flag: "GB", label: "EN" },
  es: { flag: "ES", label: "ES" },
  ca: { flag: "CA", label: "CA" },
};

function LocaleFlag({ code, isActive }: { code: string; isActive: boolean }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-wider transition-colors",
        isActive
          ? "bg-primary-500 text-white"
          : "bg-bg-muted text-text-muted group-hover:bg-primary-100 group-hover:text-primary-700"
      )}
    >
      {LOCALE_CONFIG[code]?.flag ?? code.toUpperCase()}
    </span>
  );
}

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("ariaLabel")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "group flex items-center gap-2 rounded-full border px-2 py-1.5 transition-all duration-200 xl:px-2.5 xl:py-2",
          isOpen
            ? "border-primary-300 bg-white shadow-sm"
            : "hover:border-primary-200 border-transparent hover:bg-white/80",
          isPending && "pointer-events-none opacity-60"
        )}
      >
        <LocaleFlag code={locale} isActive />
        <span className="text-text-primary text-sm font-semibold tracking-wide xl:text-base">
          {LOCALE_CONFIG[locale]?.label ?? locale.toUpperCase()}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn(
            "text-text-muted shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      <div
        className={cn(
          "absolute right-0 z-50 mt-3 w-48 origin-top-right transition-all duration-200",
          isOpen
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <ul
          role="listbox"
          aria-label={t("ariaLabel")}
          className="overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/6"
        >
          {routing.locales.map((loc) => {
            const isActive = loc === locale;
            return (
              <li key={loc}>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    startTransition(() => {
                      router.replace({ pathname }, { locale: loc });
                    });
                  }}
                  role="option"
                  aria-selected={isActive}
                  disabled={isPending && isActive}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                    isActive ? "bg-primary-50" : "hover:bg-bg-muted"
                  )}
                >
                  <LocaleFlag code={loc} isActive={isActive} />
                  <div className="flex flex-1 flex-col">
                    <span
                      className={cn(
                        "text-sm leading-tight font-semibold",
                        isActive ? "text-primary-700" : "text-text-primary"
                      )}
                    >
                      {t(loc)}
                    </span>
                    <span className="text-text-muted text-[11px] font-medium tracking-wider uppercase">
                      {loc}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all",
                      isActive ? "bg-primary-500 scale-100" : "scale-0"
                    )}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
