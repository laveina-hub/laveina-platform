"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Input } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Optional external control (e.g. shared state with URL params). */
  defaultValue?: string;
};

export function TrackingLookupInput({ className, defaultValue = "" }: Props) {
  const t = useTranslations("activeShipments");
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const trimmed = value.trim().toUpperCase();
  const canSubmit = trimmed.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    router.push(`/tracking/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-col gap-2 sm:flex-row sm:items-center", className)}
    >
      <Input
        aria-label={t("title")}
        placeholder={t("inputPlaceholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="flex-1 uppercase"
      />
      <Button type="submit" variant="primary" disabled={!canSubmit} className="sm:w-auto">
        {t("track")}
        <ChevronIcon direction="right" className="ml-1 h-4 w-4" />
      </Button>
    </form>
  );
}
