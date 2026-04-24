"use client";

import { useLocale, useTranslations } from "next-intl";

import { ClockIcon, MapPinIcon } from "@/components/icons";
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

const RANK_BADGE_STYLES: Record<PickupPointRankBadge, string> = {
  best: "bg-primary-100 text-primary-800",
  closest: "bg-sky-50 text-sky-700",
  openNow: "bg-green-50 text-green-700",
};

// Larger variant with thumbnail + open/closed pill, used in Step 3 carousel.

export type PickupPointDetailCardProps = {
  point: (PickupPoint | PickupPointWithOverrides) & { image_url?: string | null };
  selected: boolean;
  onSelect: () => void;
  distanceKm?: number;
  /** Q6.10 — smart-sort rank badge. */
  rankBadge?: PickupPointRankBadge | null;
  className?: string;
};

export function PickupPointDetailCard({
  point,
  selected,
  onSelect,
  distanceKm,
  rankBadge,
  className,
}: PickupPointDetailCardProps) {
  const t = useTranslations("booking");
  const locale = useLocale() as Locale;
  const todaySlot = getTodayPrimarySlot(point.working_hours);
  const open = isOpenNow(point.working_hours);
  const closesAt = open ? getCurrentClosingTime(point.working_hours) : null;

  // A6 — override wins visually over weekly hours: a temporarily-closed point
  // gets the red "Temporarily Closed" badge even if it would otherwise be open.
  const overrides = "pickup_point_overrides" in point ? point.pickup_point_overrides : undefined;
  const activeOverride = getActiveOverride(overrides ?? null);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "border-border-default flex w-72 shrink-0 items-start gap-3 rounded-2xl border bg-white p-3 text-left transition-all duration-150 focus:outline-none",
        selected
          ? "border-primary-500 bg-primary-50/60 shadow-primary-500/10 shadow-md"
          : "hover:border-primary-300 hover:shadow-sm",
        className
      )}
    >
      <div className="bg-bg-secondary text-text-muted relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        {point.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={point.image_url}
            alt={t("pickupPointImageFallback")}
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/pickup-points/store-fallback.svg"
            alt={t("pickupPointImageFallback")}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-text-primary truncate text-sm font-semibold">{point.name}</p>
          {rankBadge && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                RANK_BADGE_STYLES[rankBadge]
              )}
            >
              {t(`rankBadge.${rankBadge}`)}
            </span>
          )}
          {activeOverride ? (
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-red-700 uppercase">
              {t("closedBadge")}
            </span>
          ) : (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                open ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              )}
            >
              {open ? t("openPill") : t("closedPill")}
            </span>
          )}
        </div>
        <p className="text-text-muted mb-1.5 truncate text-xs">{point.address}</p>
        {/* Q17.2 — inline reopen date when the override includes one; null
            ends_at = indefinite and we fall back to a generic message. */}
        {activeOverride && (
          <p className="mb-1.5 truncate text-xs font-medium text-red-700">
            {activeOverride.ends_at
              ? t("reopensOn", { date: formatDateMedium(activeOverride.ends_at, locale) })
              : t("reopensUnknown")}
          </p>
        )}
        <div className="text-text-muted flex items-center gap-3 text-xs">
          {distanceKm !== undefined && (
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {t("kmAway", { km: distanceKm.toFixed(1) })}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {open && closesAt
              ? t("hoursOpenNowClosesAt", { time: closesAt })
              : todaySlot
                ? t("hoursToday", { from: todaySlot[0], to: todaySlot[1] })
                : t("closedToday")}
          </span>
        </div>
      </div>
    </button>
  );
}
