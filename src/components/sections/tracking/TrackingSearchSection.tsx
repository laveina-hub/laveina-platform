"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Input, Text } from "@/components/atoms";
import { useRouter } from "@/i18n/navigation";

export function TrackingSearchSection() {
  const t = useTranslations("tracking");
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const trimmed = trackingNumber.trim();
    if (trimmed) {
      router.push(`/tracking/${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <section className="max-w-4xl rounded-xl bg-white p-6 shadow-sm md:p-9">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex-1">
          <Input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder={t("placeholder")}
            className="font-body focus:border-primary-500 focus:ring-primary-100 py-4 text-xl focus:ring-2 lg:py-6"
            aria-label={t("placeholder")}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="font-body shrink-0 px-6 py-4! text-base font-medium lg:px-10! lg:py-5! lg:text-xl"
        >
          {t("search")}
        </Button>
      </form>
      <Text variant="body" className="mt-3">
        {t("helperText")}
      </Text>
    </section>
  );
}
