"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { PickupPointCard, SavedAddressDropdown } from "@/components/molecules";
import type { SavedAddress } from "@/hooks/use-saved-addresses";
import { Link } from "@/i18n/navigation";
import { rankPickupPoints } from "@/lib/pickup-point/ranking";
import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

const PostcodeSearch = dynamic(
  () => import("@/components/molecules/PostcodeSearch").then((mod) => mod.PostcodeSearch),
  { ssr: false, loading: () => <div className="bg-bg-secondary h-10 animate-pulse rounded-lg" /> }
);

// Q6.2 / Q6.3 (divergence 2026-04-24) — TO column mirrors FROM for map,
// search, list, but deliberately omits both the GPS button AND the km
// distance number on cards. Two reasons:
//   1. `navigator.geolocation` returns the sender's location which is
//      unrelated to where the receiver will collect the parcel.
//   2. The sender rarely knows the receiver's exact address, so "1.1 km
//      from 15003" is noise — it's distance from the postcode centroid,
//      not from the receiver. Internally we still compute a reference for
//      "Best" / "Closest" ranking, we just don't show the raw km number.
// Customers route to the destination shop via the postcode search below
// and the saved-addresses dropdown above.
const PickupPointMap = dynamic(
  () => import("@/components/molecules/PickupPointMap").then((mod) => mod.PickupPointMap),
  { ssr: false, loading: () => <div className="bg-primary-50 h-56 animate-pulse rounded-xl" /> }
);

export type ToColumnProps = {
  postcode: string;
  onPostcodeChange: (p: string) => void;
  points: PickupPoint[];
  selectedPointId: string | null;
  onSelectPoint: (p: PickupPoint) => void;
  isLoading: boolean;
  modeBadge: { text: string; tone: string } | null;
  /** Selected origin — last-resort distance reference when GPS and postcode
   *  center are both unavailable. */
  originReference: PickupPoint | null;
  /** Q6.8 — user's GPS coordinates (resolved on the FROM side). Still used
   *  as a distance reference for TO pickup points, because "distance from
   *  you" is a useful sort signal even when there's no TO-side GPS prompt. */
  geoCenter: { lat: number; lng: number } | null;
  /** Q6.8 — destination-postcode center coords, used as fallback distance
   *  reference when GPS isn't shared. */
  postcodeCenter: { lat: number; lng: number } | null;
  /** A5 — fires when user picks a saved address from the dropdown. */
  onSavedAddressSelect: (address: SavedAddress) => void;
};

export function ToColumn({
  postcode,
  onPostcodeChange,
  points,
  selectedPointId,
  onSelectPoint,
  isLoading,
  modeBadge,
  originReference,
  geoCenter,
  postcodeCenter,
  onSavedAddressSelect,
}: ToColumnProps) {
  const t = useTranslations("booking");

  // Q6.8 — distance reference priority: GPS → postcode center → selected
  // origin (last-resort fallback when user typed a postcode we can't geocode).
  const distanceReference = geoCenter
    ? { latitude: geoCenter.lat, longitude: geoCenter.lng }
    : postcodeCenter
      ? { latitude: postcodeCenter.lat, longitude: postcodeCenter.lng }
      : originReference;

  // Q6.10 — rank destination points relative to the reference so the "Best"
  // / "Closest" badges surface the most useful option first, even though
  // the raw km number is not shown on cards (see top-of-file note).
  const rankMap = rankPickupPoints(points, distanceReference);

  // Memoized selected-point lookup — used for the details card and map
  // highlight. The map always renders every marker in `points`; selection
  // only swaps the marker style via PickupPointMap.
  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedPointId) ?? null,
    [points, selectedPointId]
  );

  return (
    <div className="border-border-muted flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:p-5">
      <h2 className="text-primary-600 text-xs font-semibold tracking-wide uppercase">
        {t("toLabel")}
      </h2>

      <SavedAddressDropdown side="destination" onSelect={onSavedAddressSelect} />

      {/* Destination column intentionally omits the "Use my location" button
          that FROM exposes. My device GPS resolves to MY location, not the
          receiver's — using it on the TO side would mislead customers whose
          receiver is in a different city. Saved addresses + postcode search
          cover the receiver-pickup use case cleanly. Flagged to the client
          as a deliberate divergence from Q6.3 (2026-04-24). */}

      <PostcodeSearch
        id="destination-postcode"
        placeholder={t("destinationPostcodePlaceholder")}
        defaultValue={postcode}
        onPostcodeResolved={onPostcodeChange}
        hideButton
      />

      {modeBadge && (
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
            modeBadge.tone
          )}
        >
          {modeBadge.text}
        </span>
      )}

      <div className="h-56 overflow-hidden rounded-xl">
        <PickupPointMap
          groups={[
            {
              side: "destination",
              points,
              selectedPointId: selectedPoint?.id ?? null,
              onSelectPoint: (id) => {
                const p = points.find((x) => x.id === id);
                if (p) onSelectPoint(p);
              },
            },
          ]}
          centerOverride={geoCenter}
          mapAriaLabel={t("toLabel")}
        />
      </div>

      {isLoading && <div className="bg-bg-secondary h-14 animate-pulse rounded-xl" aria-hidden />}

      {selectedPoint ? (
        <PickupPointCard
          point={selectedPoint}
          selected
          onSelect={() => onSelectPoint(selectedPoint)}
          variant="destination"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {points.map((point) => (
            <PickupPointCard
              key={point.id}
              point={point}
              selected={false}
              onSelect={() => onSelectPoint(point)}
              variant="destination"
              rankBadge={rankMap.get(point.id) ?? null}
            />
          ))}
        </div>
      )}

      {postcode.length < 5 && (
        <p className="text-text-muted px-1 text-xs">{t("pickupPointsEmptyState")}</p>
      )}

      {postcode.length === 5 && points.length === 0 && !isLoading && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">{t("noPickupPointsForPostcode")}</p>
          <Link
            href="/coming-soon"
            className="text-primary-700 hover:text-primary-800 self-start text-xs font-semibold underline-offset-2 hover:underline"
          >
            {t("notifyMeWhenAvailable")}
          </Link>
        </div>
      )}

      {/* A2 (final spec): delivery speed is selected on Step 4, so Step 2 no
          longer shows a price preview — the older Q6.7 "Your price" card was
          removed because it pre-committed to a speed the user had not yet
          chosen. Price now appears on Step 3 (line items) and Step 4 (final
          total with the user-selected speed). */}
    </div>
  );
}
