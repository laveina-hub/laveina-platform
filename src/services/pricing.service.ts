import {
  calcBillableWeightKg,
  calcVolumetricWeightKg,
  getTierForWeight,
  validateParcelDimensions,
} from "@/constants/parcel-sizes";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();
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
  originPostcode: string;
  destinationPostcode: string;
};

export async function getRates(input: GetRatesInput): Promise<ApiResponse<PriceBreakdown>> {
  const {
    deliveryMode,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    insuranceOptionId,
    originPostcode,
    destinationPostcode,
  } = input;

  console.log("\n========== [PRICING] getRates START ==========");
  console.log("[PRICING] Delivery mode:", deliveryMode);
  console.log("[PRICING] Route:", originPostcode, "→", destinationPostcode);
  console.log("[PRICING] Dimensions:", `${lengthCm} x ${widthCm} x ${heightCm} cm`);
  console.log("[PRICING] Actual weight:", weightKg, "kg");

  const dimCheck = validateParcelDimensions(lengthCm, widthCm, heightCm);
  if (!dimCheck.valid) {
    console.log("[PRICING] ❌ Dimension validation failed:", dimCheck.error);
    return {
      data: null,
      error: { message: dimCheck.error, code: "INVALID_DIMENSIONS", status: 422 },
    };
  }

  // SendCloud prices by actual weight only — volumetric billing is a Laveina-internal concept
  const useVolumetric = deliveryMode === DeliveryMode.INTERNAL;
  const volumetricWeightKg = useVolumetric
    ? calcVolumetricWeightKg(lengthCm, widthCm, heightCm)
    : 0;
  const billableWeightKg = useVolumetric
    ? calcBillableWeightKg(weightKg, lengthCm, widthCm, heightCm)
    : weightKg;

  console.log("[PRICING] Use volumetric?", useVolumetric);
  if (useVolumetric) {
    console.log(
      "[PRICING] Volumetric weight:",
      volumetricWeightKg.toFixed(2),
      "kg",
      `(${lengthCm} x ${widthCm} x ${heightCm} / 6000)`
    );
    console.log(
      "[PRICING] Billable weight:",
      billableWeightKg.toFixed(2),
      "kg",
      `(max of actual ${weightKg} kg vs volumetric ${volumetricWeightKg.toFixed(2)} kg)`
    );
  } else {
    console.log(
      "[PRICING] Billable weight:",
      billableWeightKg,
      "kg (= actual, no volumetric for SendCloud)"
    );
  }

  const tier = getTierForWeight(billableWeightKg);
  if (!tier) {
    console.log("[PRICING] ❌ Weight out of range:", billableWeightKg, "kg");
    return {
      data: null,
      error: { message: "pricing.weightOutOfRange", code: "WEIGHT_OUT_OF_RANGE", status: 422 },
    };
  }
  console.log(
    "[PRICING] Detected tier:",
    tier.size,
    `(${tier.minWeightKg}–${tier.maxWeightKg} kg)`
  );

  const [settings, insurance] = await Promise.all([
    fetchAdminSettings(),
    deliveryMode === DeliveryMode.INTERNAL ? fetchInsuranceOption(insuranceOptionId) : null,
  ]);

  const insuranceSurchargeCents = insurance?.surcharge_cents ?? 0;
  if (insurance) {
    console.log(
      "[PRICING] Insurance selected:",
      insurance.id,
      "— surcharge:",
      insuranceSurchargeCents,
      "cents"
    );
  }

  if (deliveryMode === DeliveryMode.INTERNAL) {
    const standardKey = `internal_price_${tier.size}_cents`;
    const standardCents = getSettingNumber(settings, standardKey, 0);

    console.log("[PRICING] --- INTERNAL (Barcelona) pricing ---");
    console.log("[PRICING] Price key:", standardKey, "=", standardCents, "cents");

    if (standardCents === 0) {
      console.log("[PRICING] ❌ Internal price not configured for", tier.size);
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

    console.log("[PRICING] Shipping:", standardCents, "cents");
    console.log("[PRICING] Insurance surcharge:", insuranceSurchargeCents, "cents");
    console.log("[PRICING] Subtotal:", standard.subtotalCents, "cents");
    console.log("[PRICING] IVA (21%):", standard.ivaCents, "cents");
    console.log(
      "[PRICING] TOTAL:",
      standard.totalCents,
      "cents",
      `(€${(standard.totalCents / 100).toFixed(2)})`
    );
    console.log("========== [PRICING] getRates END ==========\n");

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

  // SendCloud routes: use actual weight (SendCloud prices by weight tier, not volumetric).
  // Laveina's volumetric calculation only applies to Barcelona internal pricing.
  console.log("[PRICING] --- SENDCLOUD pricing ---");
  console.log(
    "[PRICING] Fetching SendCloud rates for",
    weightKg,
    "kg,",
    originPostcode,
    "→",
    destinationPostcode
  );

  const ratesResult = await getAvailableRates({
    weightKg: weightKg,
    fromPostalCode: originPostcode,
    toPostalCode: destinationPostcode,
  });

  if (ratesResult.error) {
    console.log("[PRICING] ❌ SendCloud rates error:", ratesResult.error.message);
    return { data: null, error: ratesResult.error };
  }

  const { standard: stdRate, express: expRate } = ratesResult.data;
  console.log(
    "[PRICING] SendCloud standard carrier rate:",
    stdRate.rateCents,
    "cents",
    `(€${(stdRate.rateCents / 100).toFixed(2)})`,
    "— method:",
    stdRate.shippingMethodId
  );
  if (expRate) {
    console.log(
      "[PRICING] SendCloud express carrier rate:",
      expRate.rateCents,
      "cents",
      `(€${(expRate.rateCents / 100).toFixed(2)})`,
      "— method:",
      expRate.shippingMethodId
    );
  } else {
    console.log("[PRICING] SendCloud express: not available");
  }

  const marginPercent = getSettingNumber(
    settings,
    "sendcloud_margin_percent",
    DEFAULT_MARGIN_PERCENT
  );
  const marginMultiplier = 1 + marginPercent / 100;
  console.log("[PRICING] Margin:", marginPercent + "%", `(multiplier: ${marginMultiplier})`);
  console.log("[PRICING] Minimum shipping:", MINIMUM_SHIPPING_CENTS, "cents");

  const applyMargin = (rateCents: number) => {
    const withMargin = Math.round(rateCents * marginMultiplier);
    const final = Math.max(MINIMUM_SHIPPING_CENTS, withMargin);
    console.log(
      "[PRICING]   Carrier:",
      rateCents,
      "cents",
      "× " + marginMultiplier,
      "=",
      withMargin,
      "cents",
      withMargin < MINIMUM_SHIPPING_CENTS
        ? `→ bumped to minimum ${MINIMUM_SHIPPING_CENTS} cents`
        : "",
      "→ final shipping:",
      final,
      "cents",
      `(€${(final / 100).toFixed(2)})`
    );
    return final;
  };

  console.log("[PRICING] Calculating STANDARD price:");
  const standard = buildPriceOption({
    shippingCents: applyMargin(stdRate.rateCents),
    carrierRateCents: stdRate.rateCents,
    marginPercent,
    insuranceSurchargeCents,
    shippingMethodId: stdRate.shippingMethodId,
    estimatedDays: stdRate.estimatedDays,
  });
  console.log("[PRICING]   Shipping:", standard.shippingCents, "cents");
  console.log("[PRICING]   Insurance surcharge:", standard.insuranceSurchargeCents, "cents");
  console.log("[PRICING]   Subtotal:", standard.subtotalCents, "cents");
  console.log("[PRICING]   IVA (21%):", standard.ivaCents, "cents");
  console.log(
    "[PRICING]   TOTAL:",
    standard.totalCents,
    "cents",
    `(€${(standard.totalCents / 100).toFixed(2)})`
  );

  let express: PriceOption | null = null;
  if (expRate) {
    console.log("[PRICING] Calculating EXPRESS price:");
    express = buildPriceOption({
      shippingCents: applyMargin(expRate.rateCents),
      carrierRateCents: expRate.rateCents,
      marginPercent,
      insuranceSurchargeCents,
      shippingMethodId: expRate.shippingMethodId,
      estimatedDays: expRate.estimatedDays,
    });
    console.log("[PRICING]   Shipping:", express.shippingCents, "cents");
    console.log("[PRICING]   Insurance surcharge:", express.insuranceSurchargeCents, "cents");
    console.log("[PRICING]   Subtotal:", express.subtotalCents, "cents");
    console.log("[PRICING]   IVA (21%):", express.ivaCents, "cents");
    console.log(
      "[PRICING]   TOTAL:",
      express.totalCents,
      "cents",
      `(€${(express.totalCents / 100).toFixed(2)})`
    );
  }

  console.log("========== [PRICING] getRates END ==========\n");

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
