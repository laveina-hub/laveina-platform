"use client";

import { useMemo, type ComponentType } from "react";

import { BoxIcon, BriefcaseIcon, FootprintsIcon, WeightIcon } from "@/components/icons";
import { getInsuranceCostCents } from "@/constants/insurance-tiers";
import { type ParcelPreset, type ParcelPresetSlug } from "@/constants/parcel-sizes";
import { useBookingStore, type DeliverySpeed, type QuoteSnapshot } from "@/hooks/use-booking-store";
import { isBarcelonaRoute } from "@/services/routing.service";

// Pricing computation for the Step 4 review screen. Pulled out of
// `Step4Confirm.tsx` so the JSX file stays under the 250-line cap and the
// math is unit-testable in isolation. Reads parcels/route/quote straight from
// the booking store so the parent doesn't have to thread props.
//
// Q15.2 — Pricing formula:
//   Subtotal = Delivery + Insurance    (both ex-VAT)
//   VAT      = 21% × Subtotal          (insurance sits inside the VAT base)
//   Total    = Subtotal + VAT
//
// Pricing source: ALWAYS the server-issued `quote` snapshot in the booking
// store. We do NOT fall back to local BCN matrix defaults when the quote is
// null — falling back leaks BCN prices into SendCloud routes when the quote
// is invalidated mid-edit (e.g. user changes a parcel on Step 4), which the
// customer would then mis-see as a "fixed" price unrelated to their route.
// When `quote` is null the hook returns empty line items / null prices, the
// payment summary renders em-dashes, and Pay is disabled until a fresh quote
// lands.

export const STEP4_IVA_RATE = 0.21;

export type BcnPricesCents = Record<
  ParcelPresetSlug,
  { standard: number; express: number; next_day: number }
>;

export type Step4LineItem = {
  preset: ParcelPreset;
  shippingExVatCents: number;
  insuranceCents: number;
};

const PRESET_ICON_BY_SLUG: Record<ParcelPresetSlug, ComponentType<{ className?: string }>> = {
  mini: BoxIcon,
  small: FootprintsIcon,
  medium: WeightIcon,
  large: BriefcaseIcon,
};

/**
 * Sum a single speed's ex-VAT shipping across every parcel in the bundle.
 * Returns null if the quote is missing OR if any parcel lacks that speed
 * (e.g. Next Day on SendCloud) — that way the speed selector hides a price
 * that we can't reliably bill the whole order at.
 */
function bundleSpeedTotal(quote: QuoteSnapshot | null, speed: DeliverySpeed): number | null {
  if (!quote || quote.parcels.length === 0) return null;
  let total = 0;
  for (const parcel of quote.parcels) {
    const cents = parcel.shippingCents[speed];
    if (cents === null) return null;
    total += cents;
  }
  return total;
}

type UseStep4PricingArgs = {
  presets: ParcelPreset[];
};

export function useStep4Pricing({ presets }: UseStep4PricingArgs) {
  const { parcels, origin, destination, requestedSpeed, actualSpeed, quote } = useBookingStore();

  // actualSpeed wins when the route forced an auto-switch on Step 2 (Next Day
  // → Express when destination moves outside Barcelona).
  const speed: DeliverySpeed = actualSpeed ?? requestedSpeed ?? "standard";

  const primaryPreset = useMemo(
    () => presets.find((p) => p.slug === parcels[0]?.preset_slug) ?? null,
    [presets, parcels]
  );
  const PrimaryIcon = primaryPreset ? PRESET_ICON_BY_SLUG[primaryPreset.slug] : BoxIcon;

  // Route-aware line items (ex-VAT per parcel) read straight from the
  // server-issued quote snapshot. BCN matrix and SendCloud carrier rates both
  // flow through `quote.parcels[i].shippingCents[speed]` — the quote endpoint
  // owns the route → price decision so the UI stays carrier-agnostic. If the
  // quote is missing, we deliberately produce no line items so Step 4 can't
  // display stale or default-matrix prices that don't match what the server
  // will actually charge.
  const lineItems: Step4LineItem[] = useMemo(() => {
    if (!quote) return [];
    return parcels
      .map((parcel, index) => {
        const quoteParcel = quote.parcels[index];
        if (!quoteParcel) return null;
        const preset = presets.find((p) => p.slug === quoteParcel.presetSlug);
        if (!preset) return null;

        const shippingExVatCents = quoteParcel.shippingCents[speed];
        if (shippingExVatCents === null) return null;

        const insuranceCents = getInsuranceCostCents(parcel.declared_value_cents ?? 0);
        return { preset, shippingExVatCents, insuranceCents };
      })
      .filter((item): item is Step4LineItem => item !== null);
  }, [parcels, presets, speed, quote]);

  const deliveryCents = lineItems.reduce((sum, item) => sum + item.shippingExVatCents, 0);
  const insuranceTotalCents = lineItems.reduce((sum, item) => sum + item.insuranceCents, 0);
  const subtotalCents = deliveryCents + insuranceTotalCents;
  const vatCents = Math.round(subtotalCents * STEP4_IVA_RATE);
  const grandTotalCents = subtotalCents + vatCents;

  // Final A2: Next Day is Barcelona-only. Hide the option entirely on any
  // other route. Prefer the quote snapshot's routing decision (server-verified)
  // over the client-side postcode check — both should agree, but the snapshot
  // is authoritative.
  const isBcnRoute =
    quote?.deliveryMode === "internal" ||
    (quote === null && isBarcelonaRoute(origin?.postcode ?? "", destination?.postcode ?? ""));
  const availableSpeeds: readonly DeliverySpeed[] = isBcnRoute
    ? (["standard", "express", "next_day"] as const)
    : (["standard", "express"] as const);

  // Speed selector tiles show the bundle's ex-VAT delivery per speed (sum of
  // every parcel's `shippingCents[speed]`) so multi-parcel orders see the
  // real per-speed total instead of just parcel #1's slice. Per Q15.2:
  // "Prices shown: Excluding VAT". A speed is treated as unavailable for
  // the bundle if any single parcel is missing that speed (e.g. Next Day on
  // SendCloud) — the tile then renders without a price label. When the
  // quote itself is missing all three speeds are null so no hardcoded
  // matrix can leak through.
  const priceBySpeed: Record<DeliverySpeed, number | null> = {
    standard: bundleSpeedTotal(quote, "standard"),
    express: bundleSpeedTotal(quote, "express"),
    next_day: bundleSpeedTotal(quote, "next_day"),
  };

  return {
    speed,
    primaryPreset,
    PrimaryIcon,
    lineItems,
    deliveryCents,
    insuranceTotalCents,
    subtotalCents,
    vatCents,
    grandTotalCents,
    availableSpeeds,
    priceBySpeed,
  };
}
