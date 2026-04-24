"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { NavigationIcon, SearchIcon, SpinnerIcon } from "@/components/icons";
import { PickupPointCard, SavedAddressDropdown } from "@/components/molecules";
import type { SavedAddress } from "@/hooks/use-saved-addresses";
import { Link } from "@/i18n/navigation";
import { haversineKm } from "@/lib/geo";
import { rankPickupPoints } from "@/lib/pickup-point/ranking";
import type { PickupPoint } from "@/types/pickup-point";

const PostcodeSearch = dynamic(
  () => import("@/components/molecules/PostcodeSearch").then((mod) => mod.PostcodeSearch),
  { ssr: false, loading: () => <div className="bg-bg-secondary h-10 animate-pulse rounded-lg" /> }
);

const PickupPointMap = dynamic(
  () => import("@/components/molecules/PickupPointMap").then((mod) => mod.PickupPointMap),
  { ssr: false, loading: () => <div className="bg-primary-50 h-56 animate-pulse rounded-xl" /> }
);

export type FromColumnProps = {
  postcode: string;
  onPostcodeChange: (p: string) => void;
  /** All origin options — drives both the map markers and the card list
   *  beneath. Selection only changes marker styling, never hides the rest. */
  points: PickupPoint[];
  selectedOrigin: PickupPoint | null;
  onSelectOrigin: (p: PickupPoint) => void;
  isLoading: boolean;
  geoCenter: { lat: number; lng: number } | null;
  /** Q6.8 — postcode center coords as fallback distance reference. */
  postcodeCenter: { lat: number; lng: number } | null;
  geoStatus: "idle" | "loading" | "error";
  onUseMyLocation: () => void;
  /** A5 — fires when user picks a saved address from the dropdown. */
  onSavedAddressSelect: (address: SavedAddress) => void;
};

export function FromColumn({
  postcode,
  onPostcodeChange,
  points,
  selectedOrigin,
  onSelectOrigin,
  isLoading,
  geoCenter,
  postcodeCenter,
  geoStatus,
  onUseMyLocation,
  onSavedAddressSelect,
}: FromColumnProps) {
  const t = useTranslations("booking");

  // Q6.8 — distance reference: GPS → postcode center → null.
  const distanceReference = geoCenter
    ? { latitude: geoCenter.lat, longitude: geoCenter.lng }
    : postcodeCenter
      ? { latitude: postcodeCenter.lat, longitude: postcodeCenter.lng }
      : null;

  // Human-readable label for the distance reference — rendered in the
  // column caption + each card's tooltip so users can tell what the km is
  // measured *from*. "you" when GPS, or the postcode itself when typed.
  const distanceReferenceLabel = geoCenter
    ? t("distanceReferenceYou")
    : postcodeCenter && postcode.length === 5
      ? postcode
      : null;

  // Q6.10 — rank by the same reference as distance so badges stay consistent.
  const rankMap = rankPickupPoints(points, distanceReference);

  return (
    <div className="border-border-muted flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:p-5">
      <h2 className="text-primary-600 text-xs font-semibold tracking-wide uppercase">
        {t("fromLabel")}
      </h2>

      <SavedAddressDropdown side="origin" onSelect={onSavedAddressSelect} />

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

      {geoStatus === "error" && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">{t("geolocationDeniedTitle")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUseMyLocation}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            >
              {t("geolocationAllow")}
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("origin-postcode")?.focus()}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              {t("geolocationEnterManually")}
            </button>
          </div>
        </div>
      )}

      <div className="text-text-muted flex items-center gap-3 text-xs">
        <span className="bg-border-default h-px flex-1" />
        <span>{t("orSeparator")}</span>
        <span className="bg-border-default h-px flex-1" />
      </div>

      <PostcodeSearch
        id="origin-postcode"
        placeholder={t("originPostcodePlaceholder")}
        defaultValue={postcode}
        onPostcodeResolved={onPostcodeChange}
        hideButton
        leftIcon={<SearchIcon className="h-4 w-4" />}
      />

      <div className="h-56 overflow-hidden rounded-xl">
        <PickupPointMap
          groups={[
            {
              side: "origin",
              points,
              selectedPointId: selectedOrigin?.id ?? null,
              onSelectPoint: (id) => {
                const p = points.find((x) => x.id === id);
                if (p) onSelectOrigin(p);
              },
            },
          ]}
          centerOverride={geoCenter}
          mapAriaLabel={t("fromLabel")}
        />
      </div>

      {selectedOrigin ? (
        <PickupPointCard
          point={selectedOrigin}
          selected
          onSelect={() => onSelectOrigin(selectedOrigin)}
          variant="origin"
          distanceKm={
            distanceReference ? haversineKm(distanceReference, selectedOrigin) : undefined
          }
          distanceReferenceLabel={distanceReferenceLabel ?? undefined}
        />
      ) : (
        <>
          {points.length > 0 && distanceReferenceLabel && (
            <p className="text-text-muted px-1 text-xs">
              {t("distanceCaption", { reference: distanceReferenceLabel })}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {points.map((p) => (
              <PickupPointCard
                key={p.id}
                point={p}
                selected={false}
                onSelect={() => onSelectOrigin(p)}
                variant="origin"
                distanceKm={distanceReference ? haversineKm(distanceReference, p) : undefined}
                distanceReferenceLabel={distanceReferenceLabel ?? undefined}
                rankBadge={rankMap.get(p.id) ?? null}
              />
            ))}
          </div>
        </>
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
    </div>
  );
}
