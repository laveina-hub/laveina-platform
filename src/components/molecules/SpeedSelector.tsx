"use client";

import { useTranslations } from "next-intl";

import { ZapIcon } from "@/components/icons";
import { type CutoffConfig, isSpeedAvailableNow } from "@/constants/cutoff-times";
import type { DeliverySpeed } from "@/hooks/use-booking-store";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

// Speed panel rendered on Step 4 (Review & Payment) per client Final A2: the
// user picks speed once the route is known. Next Day is only offered when
// both postcodes are Barcelona (08xxx) — the parent filters this via the
// `availableSpeeds` prop. The existing `shipmentType*` i18n keys are reused
// across es/ca/en (no new strings needed).
//
// Time-based availability (cutoff) rules:
//   - Standard: always available
//   - Express: disabled past cutoff_express_hour_local (default 20:00 Madrid)
//   - Next Day: disabled past cutoff_next_day_hour_local (default 18:00 Madrid)

type SpeedOption = {
  value: DeliverySpeed;
  labelKey: string;
  subtextKey: string;
};

const SPEED_OPTIONS: readonly SpeedOption[] = [
  {
    value: "standard",
    labelKey: "shipmentTypeStandard",
    subtextKey: "shipmentTypeStandardSubtext",
  },
  {
    value: "express",
    labelKey: "shipmentTypeExpress",
    subtextKey: "shipmentTypeExpressSubtext",
  },
  {
    value: "next_day",
    labelKey: "shipmentTypeNextDay",
    subtextKey: "shipmentTypeNextDaySubtext",
  },
] as const;

export type SpeedSelectorProps = {
  /** Currently selected speed (controlled). */
  value: DeliverySpeed;
  onChange: (speed: DeliverySpeed) => void;
  /** Price per speed for the currently selected size; null when no size picked. */
  priceBySpeed: Record<DeliverySpeed, number | null>;
  /** Cutoff config from admin_settings (server-fetched). */
  cutoffConfig: CutoffConfig;
  /**
   * Speeds offered for the current route. Defaults to all three. Per Final
   * A2, non-Barcelona routes pass `["standard", "express"]` so Next Day
   * never renders there.
   */
  availableSpeeds?: readonly DeliverySpeed[];
  className?: string;
};

export function SpeedSelector({
  value,
  onChange,
  priceBySpeed,
  cutoffConfig,
  availableSpeeds,
  className,
}: SpeedSelectorProps) {
  const t = useTranslations("booking");
  const visibleOptions = availableSpeeds
    ? SPEED_OPTIONS.filter((opt) => availableSpeeds.includes(opt.value))
    : SPEED_OPTIONS;
  const gridColsClass = visibleOptions.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <fieldset className={cn("flex flex-col gap-3", className)} aria-label={t("shipmentTypeTitle")}>
      <legend className="text-text-primary mb-1 text-sm font-semibold">
        {t("shipmentTypeTitle")}
      </legend>

      <div className={cn("grid gap-3", gridColsClass)}>
        {visibleOptions.map((option) => {
          const isSelected = value === option.value;
          const available = isSpeedAvailableNow(option.value, cutoffConfig);
          const disabled = !available;
          const isNextDay = option.value === "next_day";
          const priceCents = priceBySpeed[option.value];

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(option.value);
              }}
              className={cn(
                "focus-visible:ring-primary-500 relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                disabled && "cursor-not-allowed opacity-60",
                !disabled &&
                  (isSelected
                    ? "border-primary-500 bg-primary-50"
                    : "border-border-default hover:border-primary-300 bg-white")
              )}
            >
              {isNextDay && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <ZapIcon className="h-3 w-3" aria-hidden />
                  {t("shipmentTypeBarcelonaOnly")}
                </span>
              )}

              <span className="text-text-primary text-base font-semibold">
                {t(option.labelKey)}
              </span>
              <span className="text-text-muted text-xs">{t(option.subtextKey)}</span>

              {priceCents !== null && (
                <span className="text-text-primary mt-1 text-sm font-semibold">
                  {t("fromPrice", { price: formatCents(priceCents) })}
                </span>
              )}

              {disabled && (
                <span className="text-text-muted mt-1 text-xs italic">
                  {t("shipmentTypePastCutoff")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
