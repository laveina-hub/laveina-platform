// Internal = fixed prices per weight tier, SendCloud = carrier rates + margin. IVA 21%.

import {
  calcBillableWeightKg,
  calcVolumetricWeightKg,
  getTierForWeight,
  validateParcelDimensions,
} from "@/constants/parcel-sizes";
import { createClient } from "@/lib/supabase/server";
import { getAvailableRates } from "@/services/sendcloud.service";
import type { ApiResponse } from "@/types/api";
import { DeliveryMode } from "@/types/enums";
import type { PriceBreakdown, PriceOption } from "@/types/shipment";

const IVA_RATE = 0.21;
const MINIMUM_SHIPPING_CENTS = 400;
const BASE_INSURANCE_COVERAGE_CENTS = 2500;
const DEFAULT_MARGIN_PERCENT = 25;

type AdminSettings = Record<string, string>;

async function fetchAdminSettings(): Promise<AdminSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_settings").select("key, value");
  if (!data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export function getSettingNumber(settings: AdminSettings, key: string, fallback: number): number {
  const raw = settings[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return isNaN(parsed) ? fallback : parsed;
}

type InsuranceOption = {
  id: string;
  coverage_amount_cents: number;
  surcharge_cents: number;
};

async function fetchInsuranceOption(
  insuranceOptionId: string | null
): Promise<InsuranceOption | null> {
  if (!insuranceOptionId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("insurance_options")
    .select("id, coverage_amount_cents, surcharge_cents")
    .eq("id", insuranceOptionId)
    .eq("is_active", true)
    .single();
  return data ?? null;
}

function buildPriceOption({
  shippingCents,
  carrierRateCents,
  marginPercent,
  insuranceSurchargeCents,
  shippingMethodId,
  estimatedDays,
}: {
  shippingCents: number;
  carrierRateCents: number;
  marginPercent: number;
  insuranceSurchargeCents: number;
  shippingMethodId: number | null;
  estimatedDays: string | null;
}): PriceOption {
  const subtotalCents = shippingCents + insuranceSurchargeCents;
  const ivaCents = Math.round(subtotalCents * IVA_RATE);
  const totalCents = subtotalCents + ivaCents;

  return {
    shippingCents,
    carrierRateCents,
    marginPercent,
    insuranceSurchargeCents,
    subtotalCents,
    ivaCents,
    totalCents,
    shippingMethodId,
    estimatedDays,
  };
}

export type GetRatesInput = {
  deliveryMode: "internal" | "sendcloud";
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceOptionId: string | null;
};

export async function getRates(input: GetRatesInput): Promise<ApiResponse<PriceBreakdown>> {
  const { deliveryMode, weightKg, lengthCm, widthCm, heightCm, insuranceOptionId } = input;

  // Validate dimensions
  const dimCheck = validateParcelDimensions(lengthCm, widthCm, heightCm);
  if (!dimCheck.valid) {
    return {
      data: null,
      error: { message: dimCheck.error, code: "INVALID_DIMENSIONS", status: 422 },
    };
  }

  // Calculate weights
  const volumetricWeightKg = calcVolumetricWeightKg(lengthCm, widthCm, heightCm);
  const billableWeightKg = calcBillableWeightKg(weightKg, lengthCm, widthCm, heightCm);

  // Determine tier from billable weight
  const tier = getTierForWeight(billableWeightKg);
  if (!tier) {
    return {
      data: null,
      error: { message: "pricing.weightOutOfRange", code: "WEIGHT_OUT_OF_RANGE", status: 422 },
    };
  }

  const [settings, insurance] = await Promise.all([
    fetchAdminSettings(),
    deliveryMode === DeliveryMode.INTERNAL ? fetchInsuranceOption(insuranceOptionId) : null,
  ]);

  const insuranceSurchargeCents = insurance?.surcharge_cents ?? 0;

  if (deliveryMode === DeliveryMode.INTERNAL) {
    const standardKey = `internal_price_${tier.size}_cents`;
    const standardCents = getSettingNumber(settings, standardKey, 0);

    if (standardCents === 0) {
      return {
        data: null,
        error: {
          message: "pricing.internalPriceNotConfigured",
          code: "PRICE_NOT_CONFIGURED",
          status: 422,
        },
      };
    }

    const standard = buildPriceOption({
      shippingCents: standardCents,
      carrierRateCents: 0,
      marginPercent: 0,
      insuranceSurchargeCents,
      shippingMethodId: null,
      estimatedDays: null,
    });

    return {
      data: {
        deliveryMode: DeliveryMode.INTERNAL,
        detectedTier: tier.size,
        actualWeightKg: weightKg,
        volumetricWeightKg,
        billableWeightKg,
        standard,
        express: null,
        insuranceCoverageCents: BASE_INSURANCE_COVERAGE_CENTS,
      },
      error: null,
    };
  }

  // SendCloud route
  const ratesResult = await getAvailableRates(billableWeightKg);

  if (ratesResult.error) {
    return { data: null, error: ratesResult.error };
  }

  const { standard: stdRate, express: expRate } = ratesResult.data;
  const marginPercent = getSettingNumber(
    settings,
    "sendcloud_margin_percent",
    DEFAULT_MARGIN_PERCENT
  );
  const marginMultiplier = 1 + marginPercent / 100;

  const applyMargin = (rateCents: number) =>
    Math.max(MINIMUM_SHIPPING_CENTS, Math.round(rateCents * marginMultiplier));

  const standard = buildPriceOption({
    shippingCents: applyMargin(stdRate.rateCents),
    carrierRateCents: stdRate.rateCents,
    marginPercent,
    insuranceSurchargeCents,
    shippingMethodId: stdRate.shippingMethodId,
    estimatedDays: stdRate.estimatedDays,
  });

  const express = expRate
    ? buildPriceOption({
        shippingCents: applyMargin(expRate.rateCents),
        carrierRateCents: expRate.rateCents,
        marginPercent,
        insuranceSurchargeCents,
        shippingMethodId: expRate.shippingMethodId,
        estimatedDays: expRate.estimatedDays,
      })
    : null;

  return {
    data: {
      deliveryMode: DeliveryMode.SENDCLOUD,
      detectedTier: tier.size,
      actualWeightKg: weightKg,
      volumetricWeightKg,
      billableWeightKg,
      standard,
      express,
      insuranceCoverageCents: BASE_INSURANCE_COVERAGE_CENTS,
    },
    error: null,
  };
}
