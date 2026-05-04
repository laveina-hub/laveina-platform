"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/atoms";
import { ChevronIcon, SpinnerIcon } from "@/components/icons";
import {
  ConfirmDialog,
  PickupPointPickerSheet,
  SpeedAutoSwitchBanner,
} from "@/components/molecules";
import { isSpeedAvailableNow, type CutoffConfig } from "@/constants/cutoff-times";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { usePostcodeCenter } from "@/hooks/use-postcode-center";
import { useQuote } from "@/hooks/use-quote";
import type { SavedAddress } from "@/hooks/use-saved-addresses";
import { formatDateMedium, type Locale } from "@/lib/format";
import { getActiveOverride } from "@/lib/pickup-point/working-hours";
import { cn } from "@/lib/utils";
import { getDeliveryMode, isBarcelonaRoute } from "@/services/routing.service";
import type { PickupPoint, PickupPointWithOverrides } from "@/types/pickup-point";

import { FromColumn } from "./Step2Route.From";
import { Step2RouteMobileCard } from "./Step2Route.MobileCard";
import { ToColumn } from "./Step2Route.To";
import { getBrowserPosition } from "./Step2Route.utils";

// Step 2 — Origin & Destination. Per client answer Q6.2 each column owns its
// own map so FROM and TO are fully symmetric (map, use-my-location, search,
// list, distance). The map is a browse surface: every available pickup
// point stays rendered, and selection only swaps the marker style (branded
// Pin.svg at 40px on top for selected, plain map-pin.svg at 28px for the
// rest). Matches DPD / InPost / Correos / Packeta behavior so users can
// change their mind by clicking another marker.
// Mobile still uses the single shared picker sheet (Q7.1/Q7.3) with FROM/TO
// tabs — that sheet renders the active side's map and list.

type Step2RouteProps = {
  cutoffConfig: CutoffConfig;
};

export function Step2Route({ cutoffConfig }: Step2RouteProps) {
  const t = useTranslations("booking");
  const locale = useLocale() as Locale;
  const {
    parcels,
    origin,
    destination,
    requestedSpeed,
    actualSpeed,
    speedAdjustedReason,
    setOrigin,
    setDestination,
    setActualSpeed,
    setStep,
  } = useBookingStore();

  const [autoSwitchDismissed, setAutoSwitchDismissed] = useState(false);

  // Q7.3 — single sheet instance lifted from the two MobileCards so the user
  // can tab between FROM and TO without closing. null = sheet closed.
  const [pickerSide, setPickerSide] = useState<"origin" | "destination" | null>(null);

  // A6 — hold a user-clicked closed pickup point until they confirm via the
  // warning dialog. `side` tells us which column to commit to.
  const [pendingClosedSelection, setPendingClosedSelection] = useState<{
    side: "origin" | "destination";
    point: PickupPointWithOverrides;
    reopensAt: string | null;
  } | null>(null);

  const geocodingLib = useMapsLibrary("geocoding");

  const [originPostcode, setOriginPostcode] = useState(origin?.postcode ?? "");
  const [destinationPostcode, setDestinationPostcode] = useState(destination?.postcode ?? "");
  // Q6.2/Q6.3 — each side owns its own GPS center so "Use my location" on one
  // column never overwrites the other column's map.
  // Single shared GPS coord — resolved only via the FROM-side "Use my
  // location" button since the TO side no longer exposes GPS (see Q6.3
  // divergence note below). Both columns read this as a distance hint when
  // the user hasn't typed a postcode yet.
  const [originGeoCenter, setOriginGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [originGeoStatus, setOriginGeoStatus] = useState<"idle" | "loading" | "error">("idle");
  // Q6.8 — postcode-centre coords used as distance reference when the user
  // hasn't shared GPS. The hook owns the geocode + state per side so typing
  // here doesn't re-run the call twice on the same postcode.
  const originPostcodeCenter = usePostcodeCenter(originPostcode);
  const destinationPostcodeCenter = usePostcodeCenter(destinationPostcode);

  const resolveUserLocation = useCallback(async () => {
    if (!geocodingLib) throw new Error("geocoding_unavailable");
    const position = await getBrowserPosition();
    const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
    const geocoder = new geocodingLib.Geocoder();
    const { results } = await geocoder.geocode({ location: coords });
    for (const result of results) {
      const comp = result.address_components.find((c) => c.types.includes("postal_code"));
      if (comp?.long_name) return { postcode: comp.long_name, coords };
    }
    throw new Error("no_postcode");
  }, [geocodingLib]);

  const originQuery = usePickupPoints(originPostcode.length === 5 ? originPostcode : undefined);
  const destinationQuery = usePickupPoints(
    destinationPostcode.length === 5 ? destinationPostcode : undefined
  );

  const originPoints = useMemo(() => originQuery.data ?? [], [originQuery.data]);
  const destinationPoints = useMemo(() => destinationQuery.data ?? [], [destinationQuery.data]);

  const selectedOrigin = useMemo<PickupPoint | null>(
    () => originPoints.find((p) => p.id === origin?.pickupPointId) ?? null,
    [originPoints, origin?.pickupPointId]
  );
  const selectedDestination = useMemo<PickupPoint | null>(
    () => destinationPoints.find((p) => p.id === destination?.pickupPointId) ?? null,
    [destinationPoints, destination?.pickupPointId]
  );

  const routingMode =
    originPostcode.length === 5 && destinationPostcode.length === 5
      ? getDeliveryMode(originPostcode, destinationPostcode).mode
      : null;

  // Q6.6 — only show the "Next Day" badge when the user can actually still
  // book it: BCN→BCN route AND we're before the daily cutoff (default 18:00
  // Europe/Madrid). Past cutoff the badge falls back to a "tomorrow" hint
  // so the user understands why Next Day disappeared.
  // A2 (final spec): speed is picked on Step 4, so Step 2 intentionally
  // surfaces no Standard/Express badge — those were a dev extension beyond
  // what the client asked for and leaked Step-4 state into Step 2.
  const nextDayAvailable = isSpeedAvailableNow("next_day", cutoffConfig);
  const modeBadge =
    routingMode === "blocked"
      ? { text: t("routeBlocked"), tone: "bg-red-50 text-red-700" }
      : requestedSpeed === "next_day" && routingMode === "internal"
        ? nextDayAvailable
          ? { text: t("barcelonaNextDay"), tone: "bg-green-50 text-green-700" }
          : { text: t("barcelonaNextDayPastCutoff"), tone: "bg-amber-50 text-amber-700" }
        : null;

  // Route-aware quote via POST /api/shipments/quote. For BCN the quote reads
  // the fixed matrix (synchronous server-side); for non-BCN it calls SendCloud
  // (live rate + margin + VAT). The hook mirrors the response into the booking
  // store so later steps share the figures.
  //
  // A2 (final spec): speed is selected on Step 4, so Step 2 no longer displays
  // a price. We still fire the quote to (a) validate route serviceability for
  // the "Next" gate below and (b) pre-populate Step 3's line items.
  const quoteQuery = useQuote({
    originPostcode: originPostcode.length === 5 ? originPostcode : null,
    destinationPostcode: destinationPostcode.length === 5 ? destinationPostcode : null,
    parcels,
  });
  const quoteHasStandardRate: boolean = quoteQuery.data?.totals.standard != null;

  // Fail closed on any quote failure (SendCloud outage, rate-limit, etc.).
  // The `useQuote` hook is disabled until inputs are valid, so isError only
  // fires once we actually tried to quote.
  const quoteErrored = quoteQuery.isError && quoteQuery.isFetched;

  // Visible loading state for the Next button + inline status. We're "quoting"
  // when the request is in flight AND we don't yet have a standard rate to
  // show. Refetches behind a still-valid cached rate stay invisible — no UI
  // jitter when TanStack Query revalidates in the background.
  const isQuoting = quoteQuery.isFetching && !quoteHasStandardRate;

  // A delivery from a pickup point to itself is nonsensical: BCN routes would
  // silently accept it and create a self-shipment, SendCloud routes would fail
  // at carrier dispatch. Block at the UI so the user sees the reason inline
  // instead of hitting a generic error on Pay. Server-side schemas mirror this.
  const samePickupPoint =
    !!origin?.pickupPointId &&
    !!destination?.pickupPointId &&
    origin.pickupPointId === destination.pickupPointId;

  const canContinue =
    !!origin?.pickupPointId &&
    !!destination?.pickupPointId &&
    !samePickupPoint &&
    !quoteErrored &&
    quoteHasStandardRate;

  // A2 UPDATED (2026-04-21): Next Day is Barcelona-only. When the user picked
  // Next Day on Step 1 but the resolved route isn't BCN→BCN, auto-switch to
  // Express and surface a banner. When the route later becomes BCN→BCN (or the
  // user picks a different speed), clear the override so actualSpeed ==
  // requestedSpeed again.
  useEffect(() => {
    const routeResolved = originPostcode.length === 5 && destinationPostcode.length === 5;
    if (!routeResolved) return;

    const isBcn = isBarcelonaRoute(originPostcode, destinationPostcode);

    if (requestedSpeed === "next_day" && !isBcn) {
      if (actualSpeed !== "express" || speedAdjustedReason !== "route_not_barcelona") {
        setActualSpeed("express", "route_not_barcelona");
        setAutoSwitchDismissed(false);
      }
    } else if (speedAdjustedReason === "route_not_barcelona") {
      setActualSpeed(null, null);
    }
  }, [
    originPostcode,
    destinationPostcode,
    requestedSpeed,
    actualSpeed,
    speedAdjustedReason,
    setActualSpeed,
  ]);

  const showAutoSwitchBanner =
    speedAdjustedReason === "route_not_barcelona" && !autoSwitchDismissed;

  function commitOrigin(point: PickupPoint) {
    setOrigin({ postcode: originPostcode || point.postcode, pickupPointId: point.id });
  }

  function commitDestination(point: PickupPoint) {
    setDestination({
      postcode: destinationPostcode || point.postcode,
      pickupPointId: point.id,
    });
  }

  // A6 — intercept clicks on temporarily-closed points. Per client answer,
  // both origin and destination are selectable with a warning. Non-closed
  // selections pass straight through to commit.
  function handleSelectOrigin(point: PickupPoint) {
    const overrides =
      "pickup_point_overrides" in point
        ? (point as PickupPointWithOverrides).pickup_point_overrides
        : null;
    const activeOverride = getActiveOverride(overrides);
    if (activeOverride) {
      setPendingClosedSelection({
        side: "origin",
        point: point as PickupPointWithOverrides,
        reopensAt: activeOverride.ends_at,
      });
      return;
    }
    commitOrigin(point);
  }

  function handleSelectDestination(point: PickupPoint) {
    const overrides =
      "pickup_point_overrides" in point
        ? (point as PickupPointWithOverrides).pickup_point_overrides
        : null;
    const activeOverride = getActiveOverride(overrides);
    if (activeOverride) {
      setPendingClosedSelection({
        side: "destination",
        point: point as PickupPointWithOverrides,
        reopensAt: activeOverride.ends_at,
      });
      return;
    }
    commitDestination(point);
  }

  function handleConfirmClosedSelection() {
    if (!pendingClosedSelection) return;
    if (pendingClosedSelection.side === "origin") {
      commitOrigin(pendingClosedSelection.point);
    } else {
      commitDestination(pendingClosedSelection.point);
    }
    setPendingClosedSelection(null);
  }

  // A5 — apply a saved address to the active column: fills the local postcode
  // state so the map + list fetch correctly, then commits to the store. The
  // pickup-point row is eventually available via usePickupPoints once the
  // postcode-scoped list loads.
  function handleSavedAddressOrigin(address: SavedAddress) {
    if (!address.pickup_point) return;
    const nextPostcode = address.pickup_point.postcode;
    setOriginPostcode(nextPostcode);
    setOrigin({ postcode: nextPostcode, pickupPointId: address.pickup_point.id });
  }

  function handleSavedAddressDestination(address: SavedAddress) {
    if (!address.pickup_point) return;
    const nextPostcode = address.pickup_point.postcode;
    setDestinationPostcode(nextPostcode);
    setDestination({ postcode: nextPostcode, pickupPointId: address.pickup_point.id });
  }

  async function handleUseMyLocation() {
    setOriginGeoStatus("loading");
    try {
      const { postcode, coords } = await resolveUserLocation();
      setOriginGeoCenter(coords);
      setOriginPostcode(postcode);
      if (origin?.postcode && postcode !== origin.postcode) setOrigin(null);
      setOriginGeoStatus("idle");
    } catch {
      setOriginGeoStatus("error");
    }
  }

  // Q6.3 divergence (2026-04-24) — "Use my location" is intentionally
  // omitted on the destination column. The sender's device location is not
  // useful for finding the receiver's pickup point. Destination routing
  // flows via postcode search + saved addresses only.

  const pendingReopenFormatted = pendingClosedSelection?.reopensAt
    ? formatDateMedium(pendingClosedSelection.reopensAt, locale)
    : null;
  const pendingDialogBody = pendingClosedSelection
    ? pendingReopenFormatted
      ? t("closedBodyWithDate", { reopensAt: pendingReopenFormatted })
      : t("closedBodyNoDate")
    : "";

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog
        open={pendingClosedSelection !== null}
        onOpenChange={(open) => {
          if (!open) setPendingClosedSelection(null);
        }}
        title={t("closedTitle")}
        description={pendingDialogBody}
        confirmLabel={t("closedContinueAnyway")}
        cancelLabel={t("closedChooseAnother")}
        onConfirm={handleConfirmClosedSelection}
        variant="warning"
      />

      {showAutoSwitchBanner && (
        <SpeedAutoSwitchBanner
          onReview={() => setStep(1)}
          onDismiss={() => setAutoSwitchDismissed(true)}
        />
      )}

      {/* Mobile layout: stacked cards → full-screen sheet picker */}
      <div className="flex flex-col gap-4 lg:hidden">
        <Step2RouteMobileCard
          side="origin"
          postcode={originPostcode}
          onPostcodeChange={(p) => {
            setOriginPostcode(p);
            if (origin?.postcode && p !== origin.postcode) setOrigin(null);
          }}
          selectedPoint={selectedOrigin}
          onOpenPicker={() => setPickerSide("origin")}
          geoStatus={originGeoStatus}
          onUseMyLocation={handleUseMyLocation}
          onSavedAddressSelect={handleSavedAddressOrigin}
        />

        <Step2RouteMobileCard
          side="destination"
          postcode={destinationPostcode}
          onPostcodeChange={(p) => {
            setDestinationPostcode(p);
            if (destination?.postcode && p !== destination.postcode) setDestination(null);
          }}
          selectedPoint={selectedDestination}
          onOpenPicker={() => setPickerSide("destination")}
          onSavedAddressSelect={handleSavedAddressDestination}
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
      </div>

      {/* Desktop layout: inline two-column — each column owns its own map (Q6.2). */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <FromColumn
          postcode={originPostcode}
          onPostcodeChange={(p) => {
            setOriginPostcode(p);
            if (origin?.postcode && p !== origin.postcode) setOrigin(null);
          }}
          points={originPoints}
          selectedOrigin={selectedOrigin}
          onSelectOrigin={handleSelectOrigin}
          isLoading={originQuery.isFetching}
          geoCenter={originGeoCenter}
          postcodeCenter={originPostcodeCenter}
          geoStatus={originGeoStatus}
          onUseMyLocation={handleUseMyLocation}
          onSavedAddressSelect={handleSavedAddressOrigin}
        />

        <ToColumn
          postcode={destinationPostcode}
          onPostcodeChange={(p) => {
            setDestinationPostcode(p);
            if (destination?.postcode && p !== destination.postcode) setDestination(null);
          }}
          points={destinationPoints}
          selectedPointId={destination?.pickupPointId ?? null}
          onSelectPoint={handleSelectDestination}
          isLoading={destinationQuery.isFetching}
          modeBadge={modeBadge}
          originReference={selectedOrigin}
          geoCenter={originGeoCenter}
          postcodeCenter={destinationPostcodeCenter}
          onSavedAddressSelect={handleSavedAddressDestination}
        />
      </div>

      {samePickupPoint && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
          <p className="font-semibold text-red-900">{t("samePickupPointTitle")}</p>
          <p className="mt-0.5 text-red-800">{t("samePickupPointBody")}</p>
        </div>
      )}

      {quoteErrored && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">{t("quoteUnavailableTitle")}</p>
            <p className="mt-0.5 text-amber-800">{t("quoteUnavailableBody")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => quoteQuery.refetch()}
            disabled={quoteQuery.isFetching}
          >
            {t("quoteRetry")}
          </Button>
        </div>
      )}

      {/* Inline pricing-status hint. Carrier-aware copy turns a 1-3s SendCloud
          wait from "the page is slow" into "we're checking real shipping
          rates." aria-live polite so screen readers announce it without
          interrupting current focus. */}
      {isQuoting && !quoteErrored && (
        <div
          role="status"
          aria-live="polite"
          className="text-text-muted flex items-center gap-2 text-sm"
        >
          <SpinnerIcon className="text-primary-500 h-4 w-4 animate-spin" aria-hidden />
          <span>
            {routingMode === "sendcloud" ? t("checkingCarrierRates") : t("calculatingDelivery")}
          </span>
        </div>
      )}

      {/* Q7.3 — shared mobile picker with FROM/TO tabs. Single instance so
          switching tabs preserves the sheet + transient state. */}
      <PickupPointPickerSheet
        open={pickerSide !== null}
        onOpenChange={(isOpen) => !isOpen && setPickerSide(null)}
        side={pickerSide ?? "origin"}
        onSwitchSide={(next) => setPickerSide(next)}
        postcode={pickerSide === "destination" ? destinationPostcode : originPostcode}
        points={pickerSide === "destination" ? destinationPoints : originPoints}
        initialSelectedId={
          pickerSide === "destination"
            ? (destination?.pickupPointId ?? null)
            : (origin?.pickupPointId ?? null)
        }
        originReference={pickerSide === "destination" ? selectedOrigin : null}
        onConfirm={(point) => {
          if (pickerSide === "destination") {
            handleSelectDestination(point);
          } else {
            handleSelectOrigin(point);
          }
          setPickerSide(null);
        }}
        isLoading={
          pickerSide === "destination" ? destinationQuery.isFetching : originQuery.isFetching
        }
      />

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" size="md" onClick={() => setStep(1)}>
          <ChevronIcon className="mr-1 h-4 w-4" />
          {t("back")}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setStep(3)}
          disabled={!canContinue}
          aria-busy={isQuoting}
        >
          {isQuoting ? (
            <>
              <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {t("calculatingPrice")}
            </>
          ) : (
            <>
              {t("next")}
              <ChevronIcon direction="right" className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
