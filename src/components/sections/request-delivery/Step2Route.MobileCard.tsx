"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Button } from "@/components/atoms";
import {
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  NavigationIcon,
  SearchIcon,
  SpinnerIcon,
} from "@/components/icons";
import { SavedAddressDropdown } from "@/components/molecules";
import type { SavedAddress } from "@/hooks/use-saved-addresses";
import { getTodayPrimarySlot } from "@/lib/pickup-point/working-hours";
import type { PickupPoint } from "@/types/pickup-point";

const PostcodeSearch = dynamic(
  () => import("@/components/molecules/PostcodeSearch").then((mod) => mod.PostcodeSearch),
  { ssr: false, loading: () => <div className="bg-bg-secondary h-10 animate-pulse rounded-lg" /> }
);

// Mobile Step 2 card — one per side (FROM / TO). Shows:
//  - postcode input (+ "Use my location" + error, FROM only)
//  - selected pickup summary with "Change" button, OR
//  - "Choose pickup point" CTA (disabled until postcode resolves)
//
// Tapping the CTA opens the full-screen picker sheet; confirming the sheet
// commits the selection to the parent via onSelect.
//
// Q6.3 divergence (2026-04-24) — "Use my location" is wired only on the
// FROM side. The parent omits `onUseMyLocation` for the destination so the
// GPS block is hidden (sender's device location is unrelated to the
// receiver's pickup point).

export type Step2RouteMobileCardProps = {
  side: "origin" | "destination";
  postcode: string;
  onPostcodeChange: (p: string) => void;
  selectedPoint: PickupPoint | null;
  /** Q7.3 — sheet is owned by the parent so FROM/TO tabs work. */
  onOpenPicker: () => void;
  /** Geolocation state per side (Q6.3). */
  geoStatus?: "idle" | "loading" | "error";
  onUseMyLocation?: () => void;
  /** A5 — fires when user picks a saved address from the dropdown. */
  onSavedAddressSelect: (address: SavedAddress) => void;
};

export function Step2RouteMobileCard({
  side,
  postcode,
  onPostcodeChange,
  selectedPoint,
  onOpenPicker,
  geoStatus,
  onUseMyLocation,
  onSavedAddressSelect,
}: Step2RouteMobileCardProps) {
  const t = useTranslations("booking");

  const labelKey = side === "origin" ? "fromLabel" : "toLabel";
  const placeholderKey = side === "origin" ? "searchPickupPoint" : "destinationPostcodePlaceholder";
  // Only the FROM side renders the GPS block — see Q6.3 divergence above.
  const canPick = postcode.length === 5;

  return (
    <div className="border-border-muted flex flex-col gap-3 rounded-2xl border bg-white p-4">
      <h2 className="text-primary-600 text-xs font-semibold tracking-wide uppercase">
        {t(labelKey)}
      </h2>

      <SavedAddressDropdown side={side} onSelect={onSavedAddressSelect} />

      {onUseMyLocation && (
        <>
          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={geoStatus === "loading"}
            className="border-border-default text-text-primary hover:border-primary-300 inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {geoStatus === "loading" ? (
              <SpinnerIcon className="text-primary-500 h-4 w-4 animate-spin" />
            ) : (
              <NavigationIcon className="text-primary-500 h-4 w-4" />
            )}
            {t("useMyLocation")}
          </button>

          {/* Hide the GPS error once it becomes irrelevant: the user has either
              typed a valid postcode or already selected a pickup point. Avoids
              stale error copy lingering after the user has moved past the
              "find nearest" step. */}
          {geoStatus === "error" && postcode.length < 5 && !selectedPoint && (
            <p className="text-xs text-red-600">{t("geolocationError")}</p>
          )}

          <div className="text-text-muted flex items-center gap-3 text-xs">
            <span className="bg-border-default h-px flex-1" />
            <span>{t("orSeparator")}</span>
            <span className="bg-border-default h-px flex-1" />
          </div>
        </>
      )}

      <PostcodeSearch
        id={`${side}-postcode-mobile`}
        placeholder={t(placeholderKey)}
        defaultValue={postcode}
        onPostcodeResolved={onPostcodeChange}
        hideButton
        leftIcon={side === "origin" ? <SearchIcon className="h-4 w-4" /> : undefined}
      />

      {selectedPoint ? (
        <SelectedSummary point={selectedPoint} onChange={onOpenPicker} disabled={!canPick} />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onOpenPicker}
          disabled={!canPick}
          className="w-full justify-between"
        >
          {/* Q7.2 — once a postcode is resolved we have a list to browse, so
              the CTA shifts from the imperative "Choose pickup point" to the
              more list-aware "View all pickup points". */}
          <span>{canPick ? t("viewAllPickupPoints") : t("choosePickupPoint")}</span>
          <ChevronIcon direction="right" className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

type SelectedSummaryProps = {
  point: PickupPoint;
  onChange: () => void;
  disabled: boolean;
};

function SelectedSummary({ point, onChange, disabled }: SelectedSummaryProps) {
  const t = useTranslations("booking");
  const todaySlot = getTodayPrimarySlot(point.working_hours);

  return (
    <div className="border-primary-500 bg-primary-50/60 flex items-center gap-3 rounded-xl border px-4 py-3">
      <div
        className="bg-primary-500 flex h-5 w-5 shrink-0 items-center justify-center rounded"
        aria-hidden
      >
        <CheckIcon className="h-3 w-3 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text-primary truncate text-sm font-medium">{point.name}</p>
        <p className="text-text-muted truncate text-xs">{point.address}</p>
        <span className="text-text-muted mt-0.5 inline-flex items-center gap-1 text-xs">
          <ClockIcon className="h-3 w-3" />
          {todaySlot ? t("hoursToday", { from: todaySlot[0], to: todaySlot[1] }) : t("closedToday")}
        </span>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="text-primary-600 hover:text-primary-700 text-xs font-semibold disabled:opacity-50"
      >
        {t("change")}
      </button>
    </div>
  );
}
