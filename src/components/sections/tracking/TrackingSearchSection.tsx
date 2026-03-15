"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Input, Text } from "@/components/atoms";
import { useRouter } from "@/i18n/navigation";

export function TrackingSearchSection() {
  const t = useTranslations("tracking");
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = trackingNumber.trim();
    if (trimmed) {
      router.push(`/tracking/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm md:p-8 lg:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder={t("placeholder")}
            className="font-body focus:border-primary-500 focus:ring-primary-100 py-3 text-sm focus:ring-2"
            aria-label={t("placeholder")}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="font-body shrink-0 self-start font-semibold sm:self-center sm:px-10"
        >
          {t("search")}
        </Button>
      </form>
      <Text variant="caption" className="mt-2">
        {t("helperText")}
      </Text>
    </section>
  );
}
