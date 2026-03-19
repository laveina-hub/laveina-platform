// ─── Pricing service ──────────────────────────────────────────────────────────
// Dual pricing engine for Laveina:
//
//   • Internal (Barcelona → Barcelona):
//       Price fetched from admin_settings (key: "internal_price_<size>_cents").
//       Always standard speed only — no express for internal routes.
//       Insurance: Laveina-managed tiers from insurance_options table.
//
//   • SendCloud (rest of Spain):
//       Carrier rates via SendCloud API. Cheapest = standard, fastest ≤24h = express.
//       Margin applied (key: "sendcloud_margin_percent" in admin_settings, default 25).
//       Minimum shipping price: €4.00 (400 cents) after margin.
//       Insurance: carrier insurance surcharge from insurance_options table.
//
// IVA: 21% applied uniformly on subtotal (Phase 1).
// Base insurance coverage always included: €25 (2500 cents).

import { calcBillableWeightKg } from "@/constants/parcel-sizes";
import { createClient } from "@/lib/supabase/server";
import { getAvailableRates } from "@/services/sendcloud.service";
import type { ApiResponse } from "@/types/api";
import { DeliveryMode } from "@/types/enums";
import type { ParcelSize } from "@/types/enums";
import type { PriceBreakdown, PriceOption } from "@/types/shipment";

// ─── Constants ────────────────────────────────────────────────────────────────

const IVA_RATE = 0.21;
const MINIMUM_SHIPPING_CENTS = 400; // €4.00
const BASE_INSURANCE_COVERAGE_CENTS = 2500; // €25 always included
const DEFAULT_MARGIN_PERCENT = 25;

// ─── Admin settings helpers ───────────────────────────────────────────────────

type AdminSettings = Record<string, string>;

async function fetchAdminSettings(): Promise<AdminSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_settings").select("key, value");
  if (!data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

function getSettingNumber(settings: AdminSettings, key: string, fallback: number): number {
  const raw = settings[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return isNaN(parsed) ? fallback : parsed;
}

// ─── Insurance helpers ────────────────────────────────────────────────────────

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

// ─── Price option builder ─────────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────────

export type GetRatesInput = {
  deliveryMode: "internal" | "sendcloud";
  parcelSize: ParcelSize;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceOptionId: string | null;
};

/**
 * Calculates the full price breakdown for a shipment.
 * Called by POST /api/shipments/get-rates.
 */
export async function getRates(input: GetRatesInput): Promise<ApiResponse<PriceBreakdown>> {
  const { deliveryMode, parcelSize, weightKg, lengthCm, widthCm, heightCm, insuranceOptionId } =
    input;

  const [settings, insurance] = await Promise.all([
    fetchAdminSettings(),
    fetchInsuranceOption(insuranceOptionId),
  ]);

  const insuranceSurchargeCents = insurance?.surcharge_cents ?? 0;
  const billableWeightKg = calcBillableWeightKg(weightKg, lengthCm, widthCm, heightCm);

  // ─── Internal route (Barcelona) ─────────────────────────────────────────────
  if (deliveryMode === DeliveryMode.INTERNAL) {
    const settingKey = `internal_price_${parcelSize}_cents`;
    const shippingCents = getSettingNumber(settings, settingKey, 0);

    if (shippingCents === 0) {
      return {
        data: null,
        error: {
          message: `pricing.internalPriceNotConfigured`,
          code: "PRICE_NOT_CONFIGURED",
          status: 422,
        },
      };
    }

    const standard = buildPriceOption({
      shippingCents,
      carrierRateCents: 0,
      marginPercent: 0,
      insuranceSurchargeCents,
      shippingMethodId: null,
      estimatedDays: null,
    });

    return {
      data: {
        deliveryMode: DeliveryMode.INTERNAL,
        billableWeightKg,
        standard,
        express: null,
        insuranceCoverageCents: BASE_INSURANCE_COVERAGE_CENTS,
      },
      error: null,
    };
  }

  // ─── SendCloud route (rest of Spain) ────────────────────────────────────────
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
      billableWeightKg,
      standard,
      express,
      insuranceCoverageCents: BASE_INSURANCE_COVERAGE_CENTS,
    },
    error: null,
  };
}
