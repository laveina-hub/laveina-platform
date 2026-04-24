"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { throwApiError } from "@/lib/api-error";
import type { ParcelItemInput } from "@/validations/shipment.schema";

import { useBookingStore, type QuoteSnapshot } from "./use-booking-store";

// Live-price hook for the booking wizard. Calls POST /api/shipments/quote
// whenever all three inputs (origin + destination + parcels[]) are valid, and
// writes the result into the booking store so every step shows consistent
// numbers without re-fetching.
//
// Rules:
//   - Disabled until both postcodes are 5-digit and there is ≥1 parcel with
//     enough data to price (preset OR full L+W+H+weight).
//   - 60s staleTime matches the server cache TTL. retry: 1 smooths transient
//     SendCloud hiccups, but a second failure bubbles through so the UI can
//     fail closed (Step 2 blocks Continue, shows "Quote unavailable").
//   - Result is mirrored into the Zustand store via useEffect so other steps
//     can consume it without each re-querying.

export type QuoteResponse = {
  delivery_mode: "internal" | "sendcloud";
  origin_postcode: string;
  destination_postcode: string;
  quoted_at: string;
  parcels: Array<{
    parcel_index: number;
    preset_slug: "mini" | "small" | "medium" | "large";
    billable_weight_kg: number;
    insurance_surcharge_cents: number;
    options: {
      standard: QuoteOption | null;
      express: QuoteOption | null;
      next_day: QuoteOption | null;
    };
  }>;
  totals: {
    standard: number | null;
    express: number | null;
    next_day: number | null;
  };
};

type QuoteOption = {
  shippingCents: number;
  carrierRateCents: number;
  marginPercent: number;
  insuranceSurchargeCents: number;
  subtotalCents: number;
  ivaCents: number;
  totalCents: number;
  shippingMethodId: number | null;
  estimatedDays: string | null;
};

const POSTCODE_REGEX = /^[0-9]{5}$/;

function canPriceParcel(parcel: ParcelItemInput): boolean {
  if (parcel.preset_slug !== null) return true;
  return (
    typeof parcel.length_cm === "number" &&
    typeof parcel.width_cm === "number" &&
    typeof parcel.height_cm === "number" &&
    typeof parcel.weight_kg === "number" &&
    parcel.weight_kg > 0
  );
}

async function fetchQuote(body: {
  origin_postcode: string;
  destination_postcode: string;
  parcels: ParcelItemInput[];
}): Promise<QuoteResponse> {
  const response = await fetch("/api/shipments/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to fetch quote");
  }
  const json = await response.json();
  return json.data as QuoteResponse;
}

function toSnapshot(response: QuoteResponse): QuoteSnapshot {
  return {
    deliveryMode: response.delivery_mode,
    originPostcode: response.origin_postcode,
    destinationPostcode: response.destination_postcode,
    quotedAt: response.quoted_at,
    parcels: response.parcels.map((p) => ({
      parcelIndex: p.parcel_index,
      presetSlug: p.preset_slug,
      billableWeightKg: p.billable_weight_kg,
      insuranceSurchargeCents: p.insurance_surcharge_cents,
      shippingCents: {
        standard: p.options.standard?.shippingCents ?? null,
        express: p.options.express?.shippingCents ?? null,
        next_day: p.options.next_day?.shippingCents ?? null,
      },
      totalCents: {
        standard: p.options.standard?.totalCents ?? null,
        express: p.options.express?.totalCents ?? null,
        next_day: p.options.next_day?.totalCents ?? null,
      },
    })),
    totals: response.totals,
  };
}

export type UseQuoteParams = {
  originPostcode: string | null | undefined;
  destinationPostcode: string | null | undefined;
  parcels: ParcelItemInput[];
};

export function useQuote({ originPostcode, destinationPostcode, parcels }: UseQuoteParams) {
  const setQuote = useBookingStore((s) => s.setQuote);

  const originOk = !!originPostcode && POSTCODE_REGEX.test(originPostcode);
  const destinationOk = !!destinationPostcode && POSTCODE_REGEX.test(destinationPostcode);
  const parcelsOk = parcels.length > 0 && parcels.every(canPriceParcel);
  const enabled = originOk && destinationOk && parcelsOk;

  // Stable cache key: the hook runs every re-render with a new parcels array
  // identity, but the server only cares about the semantic shape. JSON.stringify
  // keeps the key stable across render cycles where the content is unchanged.
  const parcelsKey = JSON.stringify(
    parcels.map((p) => ({
      s: p.preset_slug,
      w: p.weight_kg,
      l: p.length_cm ?? null,
      wi: p.width_cm ?? null,
      h: p.height_cm ?? null,
      dv: p.declared_value_cents ?? 0,
    }))
  );

  const query = useQuery({
    queryKey: ["shipment-quote", originPostcode, destinationPostcode, parcelsKey],
    queryFn: () =>
      fetchQuote({
        origin_postcode: originPostcode!,
        destination_postcode: destinationPostcode!,
        parcels,
      }),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Mirror the latest successful quote into the Zustand store so Step 2/3/4
  // can read it without duplicating the fetch. Clear when the inputs become
  // invalid so stale numbers don't leak across input changes.
  useEffect(() => {
    if (!enabled) {
      setQuote(null);
      return;
    }
    if (query.data) setQuote(toSnapshot(query.data));
  }, [enabled, query.data, setQuote]);

  return query;
}
