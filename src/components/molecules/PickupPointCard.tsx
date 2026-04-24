"use client";

import { useLocale, useTranslations } from "next-intl";

import { CheckIcon, ClockIcon, RouteIcon } from "@/components/icons";
import { formatDateMedium, type Locale } from "@/lib/format";
import type { PickupPointRankBadge } from "@/lib/pickup-point/ranking";
import {
  getActiveOverride,
  getCurrentClosingTime,
  getTodayPrimarySlot,
  isOpenNow,
} from "@/lib/pickup-point/working-hours";
import { cn } from "@/lib/utils";
import type { PickupPoint, PickupPointWithOverrides } from "@/types/pickup-point";

// Selectable pickup-point row used on Step 2 (Origin & Destination) and the
// Step 3 full-screen mobile picker. Matches Figma node 36874:6616:
//  - 1px border (#ececec), 12px radius, 20px horizontal / 12px vertical padding
//  - Origin variant (default): checkbox + name/address + hours (no distance)
//  - Destination variant: also shows route-icon + distance, separated by a
//    thin vertical divider before the hours column

export type PickupPointCardVariant = "origin" | "destination";

export type PickupPointCardProps = {
  point: PickupPoint | PickupPointWithOverrides;
  selected: boolean;
  onSelect: () => void;
  /** `destination` adds the distance column + divider. Defaults to `origin`. */
  variant?: PickupPointCardVariant;
  /** Distance in km; only rendered when variant="destination". */
  distanceKm?: number;
  /** Human-readable label for the distance reference (Q6.8) — shown in the
   *  tooltip/aria-label so users know what the km is relative to
   *  (e.g. "you" when GPS, "08001" when typed postcode). */
  distanceReferenceLabel?: string;
  /** Q6.10 — smart-sort rank badge ("best" / "closest" / "openNow"). */
  rankBadge?: PickupPointRankBadge | null;
  className?: string;
};

const RANK_BADGE_STYLES: Record<PickupPointRankBadge, string> = {
  best: "bg-primary-100 text-primary-800",
  closest: "bg-sky-50 text-sky-700",
  openNow: "bg-green-50 text-green-700",
};

export function PickupPointCard({
  point,
  selected,
  onSelect,
  distanceKm,
  distanceReferenceLabel,
  rankBadge,
  className,
}: PickupPointCardProps) {
  const t = useTranslations("booking");
  const locale = useLocale() as Locale;
  const todaySlot = getTodayPrimarySlot(point.working_hours);
  const open = isOpenNow(point.working_hours);
  const closesAt = open ? getCurrentClosingTime(point.working_hours) : null;

  // A6 — surface the "Temporarily Closed" badge when an admin/owner override
  // is active. Type guard lets cards without overrides (e.g. admin list)
  // fall through silently.
  const overrides = "pickup_point_overrides" in point ? point.pickup_point_overrides : undefined;
  const activeOverride = getActiveOverride(overrides ?? null);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-white px-5 py-3 text-left transition-colors focus:outline-none",
        selected
          ? "border-primary-500 bg-primary-50/60"
          : "border-border-muted hover:border-primary-300",
        className
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          selected ? "border-primary-500 bg-primary-500" : "border-border-default bg-white"
        )}
        aria-hidden
      >
        {selected && <CheckIcon className="h-3 w-3 text-white" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-text-primary truncate text-sm font-medium">{point.name}</p>
          {rankBadge && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                RANK_BADGE_STYLES[rankBadge]
              )}
            >
              {t(`rankBadge.${rankBadge}`)}
            </span>
          )}
          {activeOverride && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-red-700 uppercase">
              {t("closedBadge")}
            </span>
          )}
        </div>
        <p className="text-text-muted truncate text-xs">{point.address}</p>
        {/* Q17.2 — inline reopen date when the point has an active override.
            Null ends_at means indefinite — fall back to "temporarily closed"
            without a date so the UI doesn't lie about a reopen time. */}
        {activeOverride && (
          <p className="mt-0.5 truncate text-xs font-medium text-red-700">
            {activeOverride.ends_at
              ? t("reopensOn", { date: formatDateMedium(activeOverride.ends_at, locale) })
              : t("reopensUnknown")}
          </p>
        )}
      </div>

      <div className="text-text-muted flex shrink-0 items-center gap-4 text-xs">
        {/* Q6.2 / Q6.8 — distance is rendered on both origin and destination
            cards whenever a reference point is available (GPS or postcode
            center). Tooltip/aria-label names the reference so users can tell
            what "2.3 km" is measured *from*. */}
        {distanceKm !== undefined && (
          <>
            <span
              className="inline-flex items-center gap-1.5"
              title={
                distanceReferenceLabel
                  ? t("distanceTooltip", {
                      km: distanceKm.toFixed(1),
                      reference: distanceReferenceLabel,
                    })
                  : undefined
              }
              aria-label={
                distanceReferenceLabel
                  ? t("distanceTooltip", {
                      km: distanceKm.toFixed(1),
                      reference: distanceReferenceLabel,
                    })
                  : t("kmAway", { km: distanceKm.toFixed(1) })
              }
            >
              <RouteIcon className="h-4 w-4" />
              {t("kmAway", { km: distanceKm.toFixed(1) })}
            </span>
            <span aria-hidden className="bg-border-muted h-7 w-px" />
          </>
        )}
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon className="h-4 w-4" />
          {open && closesAt
            ? t("hoursOpenNowClosesAt", { time: closesAt })
            : todaySlot
              ? t("hoursToday", { from: todaySlot[0], to: todaySlot[1] })
              : t("closedToday")}
        </span>
      </div>
    </button>
  );
}
