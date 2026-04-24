"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button, Input, Text } from "@/components/atoms";
import { ChevronIcon, SearchIcon } from "@/components/icons";
import { useRouter } from "@/i18n/navigation";

export function TrackingSearchSection() {
  const t = useTranslations("tracking");
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const exampleValue = t("exampleValue");

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const trimmed = trackingNumber.trim();
    if (trimmed) {
      router.push(`/tracking/${encodeURIComponent(trimmed)}`);
    }
  }

  function fillExample() {
    setTrackingNumber(exampleValue);
    inputRef.current?.focus();
  }

  return (
    <section className="border-border-default shadow-card mx-auto w-full max-w-3xl rounded-2xl border bg-white p-6 md:p-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <SearchIcon
            className="text-text-muted pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            ref={inputRef}
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder={t("placeholder")}
            className="focus:border-primary-500 py-4 pl-12 text-base font-medium tracking-wide lg:py-5 lg:text-lg"
            aria-label={t("placeholder")}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="shrink-0 sm:px-8"
          disabled={trackingNumber.trim().length === 0}
        >
          {t("search")}
          <ChevronIcon direction="right" className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Text variant="caption" className="text-text-light">
          {t("formatHint")}
        </Text>
        <button
          type="button"
          onClick={fillExample}
          className="bg-primary-50 text-primary-700 hover:bg-primary-100 focus-visible:ring-primary-400 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="text-text-muted font-normal">{t("exampleLabel")}</span>
          <span className="font-mono tracking-wider">{exampleValue}</span>
        </button>
      </div>
    </section>
  );
}
