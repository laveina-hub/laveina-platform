import { env } from "@/env";
import {
  cancelParcel as cancelParcelApi,
  createParcel,
  fetchShippingPrice,
  fetchShippingProducts,
  getParcel as getParcelApi,
} from "@/lib/sendcloud/client";
import type { ApiResponse } from "@/types/api";
import type { SendcloudRateOption, SendcloudProductMethod } from "@/types/sendcloud";
import type { SendcloudParcel } from "@/types/sendcloud";

const EXPRESS_MAX_LEAD_HOURS = 24;

export type SendcloudRates = {
  standard: SendcloudRateOption;
  express: SendcloudRateOption | null;
};

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

type FlatMethod = {
  id: number;
  name: string;
  carrier: string;
  minWeight: number;
  maxWeight: number;
  leadTimeHours: number | null;
};

function flattenProducts(
  products: {
    name: string;
    carrier: string;
    methods: SendcloudProductMethod[];
    available_functionalities?: { last_mile?: string[] };
  }[]
): FlatMethod[] {
  const result: FlatMethod[] = [];
  for (const product of products) {
    // Laveina delivers to shop addresses (home delivery), not carrier service points
    const lastMile = product.available_functionalities?.last_mile;
    if (lastMile && !lastMile.includes("home_delivery")) continue;

    for (const method of product.methods) {
      const leadTime = method.lead_time_hours?.ES?.ES ?? null;
      result.push({
        id: method.id,
        name: method.name,
        carrier: product.carrier,
        minWeight: method.properties.min_weight,
        maxWeight: method.properties.max_weight,
        leadTimeHours: leadTime,
      });
    }
  }
  return result;
}

type PricedMethod = FlatMethod & { rateCents: number };

async function priceMethod(
  method: FlatMethod,
  fromPostalCode: string,
  toPostalCode: string,
  weightKg: number
): Promise<PricedMethod | null> {
  try {
    const prices = await fetchShippingPrice({
      shippingMethodId: method.id,
      fromPostalCode,
      toPostalCode,
      weightKg,
    });
    const price = prices[0];
    if (!price?.price) return null;
    return { ...method, rateCents: Math.round(parseFloat(price.price) * 100) };
  } catch {
    return null;
  }
}

/** Fetches standard (cheapest) and express (≤24h) Spain→Spain rates with real prices. */
export async function getAvailableRates(params: {
  weightKg: number;
  fromPostalCode: string;
  toPostalCode: string;
}): Promise<ApiResponse<SendcloudRates>> {
  const { weightKg, fromPostalCode, toPostalCode } = params;

  if (!env.SENDCLOUD_PUBLIC_KEY || !env.SENDCLOUD_SECRET_KEY) {
    console.warn("[sendcloud] No API keys configured — returning mock rates");
    return { data: getMockRates(weightKg), error: null };
  }

  try {
    const products = await fetchShippingProducts("ES", "ES");
    const allMethods = flattenProducts(products);

    const weightGrams = Math.ceil(weightKg * 1000);

    const eligible = allMethods.filter(
      (m) => m.minWeight <= weightGrams && m.maxWeight >= weightGrams
    );

    if (eligible.length === 0) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    // Split into standard (>24h or unknown) and express (≤24h)
    const standardCandidates = eligible.filter(
      (m) => m.leadTimeHours == null || m.leadTimeHours > EXPRESS_MAX_LEAD_HOURS
    );
    const expressCandidates = eligible.filter(
      (m) => m.leadTimeHours != null && m.leadTimeHours <= EXPRESS_MAX_LEAD_HOURS
    );

    // Use standard candidates if any, otherwise all eligible are standard
    const stdPool = standardCandidates.length > 0 ? standardCandidates : eligible;

    // Fetch prices in parallel (limit to top candidates to avoid excessive API calls)
    const stdPricePromises = stdPool
      .slice(0, 5)
      .map((m) => priceMethod(m, fromPostalCode, toPostalCode, weightKg));
    const expPricePromises = expressCandidates
      .slice(0, 3)
      .map((m) => priceMethod(m, fromPostalCode, toPostalCode, weightKg));

    const [stdPriced, expPriced] = await Promise.all([
      Promise.all(stdPricePromises),
      Promise.all(expPricePromises),
    ]);

    // Filter out methods with no price, sort by cheapest
    const stdWithPrices = stdPriced.filter((m): m is PricedMethod => m !== null && m.rateCents > 0);
    const expWithPrices = expPriced.filter((m): m is PricedMethod => m !== null && m.rateCents > 0);

    stdWithPrices.sort((a, b) => a.rateCents - b.rateCents);
    expWithPrices.sort((a, b) => a.rateCents - b.rateCents);

    if (stdWithPrices.length === 0) {
      return {
        data: null,
        error: { message: "sendcloud.noEligibleMethods", status: 422 },
      };
    }

    const cheapestStd = stdWithPrices[0]!;
    const standard: SendcloudRateOption = {
      shippingMethodId: cheapestStd.id,
      name: cheapestStd.name,
      carrier: cheapestStd.carrier,
      rateCents: cheapestStd.rateCents,
      estimatedDays: cheapestStd.leadTimeHours
        ? String(Math.ceil(cheapestStd.leadTimeHours / 24))
        : "2-3",
    };

    let express: SendcloudRateOption | null = null;
    if (expWithPrices.length > 0) {
      const cheapestExp = expWithPrices[0]!;
      express = {
        shippingMethodId: cheapestExp.id,
        name: cheapestExp.name,
        carrier: cheapestExp.carrier,
        rateCents: cheapestExp.rateCents,
        estimatedDays: "1",
      };
    }

    return { data: { standard, express }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.unknownError";
    return { data: null, error: { message, status: 502 } };
  }
}

export async function dispatchParcel(params: {
  shippingMethodId: number;
  receiverName: string;
  receiverPhone: string;
  destinationAddress: string;
  destinationCity: string;
  destinationPostcode: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
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
      length: params.lengthCm,
      width: params.widthCm,
      height: params.heightCm,
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

/** Cancel a SendCloud parcel (before carrier pickup). */
export async function cancelSendcloudParcel(
  sendcloudParcelId: number
): Promise<ApiResponse<{ status: string; message: string }>> {
  try {
    const result = await cancelParcelApi(sendcloudParcelId);
    return { data: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.cancelFailed";
    return { data: null, error: { message, status: 400 } };
  }
}

/** Fetch current parcel status from SendCloud (manual sync). */
export async function getSendcloudParcelStatus(
  sendcloudParcelId: number
): Promise<
  ApiResponse<{
    statusId: number;
    statusMessage: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    labelUrl: string | null;
  }>
> {
  try {
    const { parcel } = await getParcelApi(sendcloudParcelId);
    return {
      data: {
        statusId: parcel.status.id,
        statusMessage: parcel.status.message,
        trackingNumber: parcel.tracking_number,
        trackingUrl: parcel.tracking_url ?? null,
        labelUrl: parcel.label?.normal_printer?.[0] ?? null,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "sendcloud.fetchFailed";
    return { data: null, error: { message, status: 502 } };
  }
}
