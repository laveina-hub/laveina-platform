// ─── SendCloud service ────────────────────────────────────────────────────────
// Wraps the SendCloud API client with business logic:
//   • getAvailableRates() — fetch shipping methods filtered for Spain, return
//     standard (cheapest) and express (fastest ≤24h) options.
//   • dispatchParcel()   — create a parcel for a shipment and return label URL
//     + tracking number.

import { env } from "@/env";
import { fetchShippingMethods, createParcel } from "@/lib/sendcloud/client";
import type { ApiResponse } from "@/types/api";
import type { SendcloudRateOption } from "@/types/sendcloud";
import type { SendcloudParcel } from "@/types/sendcloud";

// SendCloud method IDs for express 24h carriers vary by account.
// Lead time ≤24h is used as the heuristic.
const EXPRESS_MAX_LEAD_HOURS = 24;

export type SendcloudRates = {
  standard: SendcloudRateOption;
  express: SendcloudRateOption | null;
};

// ─── Mock rates (used when SendCloud keys are not configured) ─────────────────
// Realistic placeholder values — pricing engine still applies margin + IVA on top.
// Replace with real API call once SENDCLOUD_PUBLIC_KEY + SENDCLOUD_SECRET_KEY are set.

function getMockRates(weightKg: number): SendcloudRates {
  // Base rate scales slightly with weight (mock only)
  const baseRateCents = Math.max(400, Math.round(weightKg * 80 + 320));
  const expressRateCents = Math.round(baseRateCents * 1.4);

  const standard: SendcloudRateOption = {
    shippingMethodId: 999901,
    name: "[TEST] Correos Paquete Estándar",
    carrier: "correos",
    rateCents: baseRateCents,
    estimatedDays: "3-5 días",
  };

  const express: SendcloudRateOption = {
    shippingMethodId: 999902,
    name: "[TEST] Correos Express 24h",
    carrier: "correos",
    rateCents: expressRateCents,
    estimatedDays: "1 día",
  };

  return { standard, express };
}

/**
 * Fetches Spain→Spain shipping methods and extracts the cheapest (standard)
 * and fastest ≤24h (express) options for the given weight.
 *
 * Falls back to mock rates when SendCloud credentials are not configured,
 * so the booking flow can be tested locally without real API keys.
 *
 * @param weightKg — billable weight in kg
 */
export async function getAvailableRates(weightKg: number): Promise<ApiResponse<SendcloudRates>> {
  // ── Mock mode: no credentials configured ─────────────────────────────────
  if (!env.SENDCLOUD_PUBLIC_KEY || !env.SENDCLOUD_SECRET_KEY) {
    console.warn("[sendcloud] No API keys configured — returning mock rates");
    return { data: getMockRates(weightKg), error: null };
  }

  try {
    const { shipping_methods } = await fetchShippingMethods("ES", "ES");

    const weightGrams = Math.ceil(weightKg * 1000);

    // Filter methods that can carry this weight
    const eligible = shipping_methods.filter(
      (m) => m.min_weight <= weightGrams && m.max_weight >= weightGrams
    );

    if (eligible.length === 0) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    // Standard: cheapest eligible method
    const sorted = [...eligible].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0]!;

    const standard: SendcloudRateOption = {
      shippingMethodId: cheapest.id,
      name: cheapest.name,
      carrier: cheapest.carrier,
      rateCents: Math.round(cheapest.price * 100),
      estimatedDays: null, // populated via lead_time if available
    };

    // Express: fastest method with lead_time ≤ 24h (if any)
    const expressMethods = eligible.filter((m) => {
      const country = m.countries?.find((c) => c.iso_2 === "ES");
      return country?.lead_time_hours != null && country.lead_time_hours <= EXPRESS_MAX_LEAD_HOURS;
    });

    let express: SendcloudRateOption | null = null;

    if (expressMethods.length > 0) {
      // Among express candidates, pick the cheapest
      const fastestCheapest = expressMethods.sort((a, b) => a.price - b.price)[0]!;
      express = {
        shippingMethodId: fastestCheapest.id,
        name: fastestCheapest.name,
        carrier: fastestCheapest.carrier,
        rateCents: Math.round(fastestCheapest.price * 100),
        estimatedDays: "1 día",
      };
    }

    return { data: { standard, express }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.unknownError";
    return { data: null, error: { message, status: 502 } };
  }
}

/**
 * Creates a parcel via SendCloud and returns the parcel record (includes label
 * PDF URLs and carrier tracking number once generated).
 *
 * In mock mode (no credentials), returns a fake parcel record so the dispatch
 * flow can be tested end-to-end without real API keys.
 */
export async function dispatchParcel(params: {
  shippingMethodId: number;
  receiverName: string;
  receiverPhone: string;
  destinationAddress: string;
  destinationCity: string;
  destinationPostcode: string;
  weightKg: number;
  trackingId: string;
}): Promise<ApiResponse<SendcloudParcel>> {
  // ── Mock mode ─────────────────────────────────────────────────────────────
  if (!env.SENDCLOUD_PUBLIC_KEY || !env.SENDCLOUD_SECRET_KEY) {
    console.warn("[sendcloud] No API keys configured — returning mock parcel");
    const mockParcel: SendcloudParcel = {
      id: 99990000 + Math.floor(Math.random() * 9999),
      name: params.receiverName,
      address: params.destinationAddress,
      postal_code: params.destinationPostcode,
      city: params.destinationCity,
      country: { iso_2: "ES" },
      tracking_number: `TEST-${params.trackingId}`,
      tracking_url: null,
      label: null,
      status: { id: 1, message: "Announced" },
      shipment: { id: params.shippingMethodId, name: "[TEST] Shipping method" },
      weight: params.weightKg.toFixed(3),
      order_number: params.trackingId,
    };
    return { data: mockParcel, error: null };
  }

  try {
    const { parcel } = await createParcel({
      name: params.receiverName,
      address: params.destinationAddress,
      city: params.destinationCity,
      postal_code: params.destinationPostcode,
      country: "ES",
      telephone: params.receiverPhone,
      shipment: { id: params.shippingMethodId },
      weight: params.weightKg.toFixed(3),
      order_number: params.trackingId,
      request_label: true,
      apply_shipping_rules: false,
    });

    return { data: parcel, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.dispatchFailed";
    return { data: null, error: { message, status: 502 } };
  }
}
