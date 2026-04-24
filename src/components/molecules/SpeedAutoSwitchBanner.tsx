"use client";

import { useTranslations } from "next-intl";

import { CloseIcon, InfoIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// Amber info banner shown on Step 2 when the user's requested speed (Next Day)
// isn't compatible with the chosen route (A2 UPDATED, 2026-04-21). The wizard
// already set actualSpeed = "express" in the store; this banner explains the
// change and links back to Step 1 for review.

export type SpeedAutoSwitchBannerProps = {
  onReview: () => void;
  onDismiss: () => void;
  className?: string;
};

export function SpeedAutoSwitchBanner({
  onReview,
  onDismiss,
  className,
}: SpeedAutoSwitchBannerProps) {
  const t = useTranslations("booking");

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3",
        className
      )}
    >
      <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />

      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">{t("autoSwitchTitle")}</p>
        <p className="mt-0.5 text-sm text-amber-800">{t("autoSwitchDescription")}</p>
        <button
          type="button"
          onClick={onReview}
          className="mt-2 text-sm font-semibold text-amber-900 underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          {t("autoSwitchAction")}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("autoSwitchDismiss")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-amber-700 hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
      >
        <CloseIcon className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
