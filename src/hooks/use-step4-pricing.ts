"use client";

import { useMemo, type ComponentType } from "react";

import { BoxIcon, BriefcaseIcon, FootprintsIcon, WeightIcon } from "@/components/icons";
import { getInsuranceCostCents } from "@/constants/insurance-tiers";
import { type ParcelPreset, type ParcelPresetSlug } from "@/constants/parcel-sizes";
import { useBookingStore, type DeliverySpeed } from "@/hooks/use-booking-store";
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

type UseStep4PricingArgs = {
  presets: ParcelPreset[];
  bcnPrices: BcnPricesCents;
};

export function useStep4Pricing({ presets, bcnPrices }: UseStep4PricingArgs) {
  const { parcels, origin, destination, requestedSpeed, actualSpeed, quote } = useBookingStore();

  // actualSpeed wins when the route forced an auto-switch on Step 2 (Next Day
  // → Express when destination moves outside Barcelona).
  const speed: DeliverySpeed = actualSpeed ?? requestedSpeed ?? "standard";

  const primaryPreset = useMemo(
    () => presets.find((p) => p.slug === parcels[0]?.preset_slug) ?? null,
    [presets, parcels]
  );
  const PrimaryIcon = primaryPreset ? PRESET_ICON_BY_SLUG[primaryPreset.slug] : BoxIcon;

  // Route-aware line items (ex-VAT per parcel):
  //   - BCN route → read directly from the ex-VAT matrix.
  //   - SendCloud route → read `shippingCents` from the quote snapshot
  //     (ex-VAT carrier rate × margin × floor).
  // Custom-dimension parcels resolve via the quote snapshot's billable-weight
  // mapping; falling back to preset_slug keeps BCN working when the quote
  // hasn't landed yet (e.g. back-navigation re-render).
  const lineItems: Step4LineItem[] = useMemo(() => {
    return parcels
      .map((parcel, index) => {
        const quoteParcel = quote?.parcels[index];
        const slug = quoteParcel?.presetSlug ?? parcel.preset_slug;
        if (!slug) return null;
        const preset = presets.find((p) => p.slug === slug);
        if (!preset) return null;

        let shippingExVatCents: number | null = null;
        if (quoteParcel) {
          shippingExVatCents = quoteParcel.shippingCents[speed];
        } else {
          shippingExVatCents = bcnPrices[preset.slug]?.[speed] ?? null;
        }
        if (shippingExVatCents === null) return null;

        const insuranceCents = getInsuranceCostCents(parcel.declared_value_cents ?? 0);
        return { preset, shippingExVatCents, insuranceCents };
      })
      .filter((item): item is Step4LineItem => item !== null);
  }, [parcels, presets, bcnPrices, speed, quote]);

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

  // Speed selector tiles show the primary parcel's ex-VAT delivery per speed
  // so the user sees the tier delta without the VAT layer folded in. Per
  // Q15.2: "Prices shown: Excluding VAT".
  const quotedPrimary = quote?.parcels[0];
  const primaryPresetSlug = parcels[0]?.preset_slug ?? quotedPrimary?.presetSlug ?? null;
  const priceBySpeed: Record<DeliverySpeed, number | null> = quotedPrimary
    ? quotedPrimary.shippingCents
    : primaryPresetSlug
      ? {
          standard: bcnPrices[primaryPresetSlug]?.standard ?? null,
          express: bcnPrices[primaryPresetSlug]?.express ?? null,
          next_day: bcnPrices[primaryPresetSlug]?.next_day ?? null,
        }
      : { standard: null, express: null, next_day: null };

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
