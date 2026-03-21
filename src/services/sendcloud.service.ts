import { env } from "@/env";
import { fetchShippingMethods, createParcel } from "@/lib/sendcloud/client";
import type { ApiResponse } from "@/types/api";
import type { SendcloudRateOption } from "@/types/sendcloud";
import type { SendcloudParcel } from "@/types/sendcloud";

// Express = any carrier with lead time ≤24h
const EXPRESS_MAX_LEAD_HOURS = 24;

export type SendcloudRates = {
  standard: SendcloudRateOption;
  express: SendcloudRateOption | null;
};

// Mock rates for local dev without SendCloud credentials
function getMockRates(weightKg: number): SendcloudRates {
  const baseRateCents = Math.max(400, Math.round(weightKg * 80 + 320));
  const expressRateCents = Math.round(baseRateCents * 1.4);

  const standard: SendcloudRateOption = {
    shippingMethodId: 999901,
    name: "[TEST] Standard Parcel",
    carrier: "correos",
    rateCents: baseRateCents,
    estimatedDays: "3-5",
  };

  const express: SendcloudRateOption = {
    shippingMethodId: 999902,
    name: "[TEST] Express 24h",
    carrier: "correos",
    rateCents: expressRateCents,
    estimatedDays: "1",
  };

  return { standard, express };
}

/** Fetches cheapest (standard) and fastest ≤24h (express) Spain→Spain rates. Falls back to mocks without credentials. */
export async function getAvailableRates(weightKg: number): Promise<ApiResponse<SendcloudRates>> {
  if (!env.SENDCLOUD_PUBLIC_KEY || !env.SENDCLOUD_SECRET_KEY) {
    console.warn("[sendcloud] No API keys configured — returning mock rates");
    return { data: getMockRates(weightKg), error: null };
  }

  try {
    const { shipping_methods } = await fetchShippingMethods("ES", "ES");

    const weightGrams = Math.ceil(weightKg * 1000);

    const eligible = shipping_methods.filter(
      (m) => m.min_weight <= weightGrams && m.max_weight >= weightGrams
    );

    if (eligible.length === 0) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    const sorted = [...eligible].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0]!;

    const standard: SendcloudRateOption = {
      shippingMethodId: cheapest.id,
      name: cheapest.name,
      carrier: cheapest.carrier,
      rateCents: Math.round(cheapest.price * 100),
      estimatedDays: null,
    };

    const expressMethods = eligible.filter((m) => {
      const country = m.countries?.find((c) => c.iso_2 === "ES");
      return country?.lead_time_hours != null && country.lead_time_hours <= EXPRESS_MAX_LEAD_HOURS;
    });

    let express: SendcloudRateOption | null = null;

    if (expressMethods.length > 0) {
      const fastestCheapest = expressMethods.sort((a, b) => a.price - b.price)[0]!;
      express = {
        shippingMethodId: fastestCheapest.id,
        name: fastestCheapest.name,
        carrier: fastestCheapest.carrier,
        rateCents: Math.round(fastestCheapest.price * 100),
        estimatedDays: "1",
      };
    }

    return { data: { standard, express }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.unknownError";
    return { data: null, error: { message, status: 502 } };
  }
}

/** Creates a SendCloud parcel. Returns mock data in dev without credentials. */
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
