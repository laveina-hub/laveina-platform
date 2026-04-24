import {
  calcBillableWeightKg,
  findPresetForWeight,
  type ParcelPreset,
  type ParcelPresetSlug,
} from "@/constants/parcel-sizes";
import {
  getAllSettings,
  getSettingNumber,
  type AdminSettings,
} from "@/services/admin-settings.service";
import { getAvailableRates } from "@/services/sendcloud.service";
import type { ApiResponse } from "@/types/api";
import type { PriceOption } from "@/types/shipment";

const IVA_RATE = 0.21;
const DEFAULT_MIN_SHIPPING_CENTS = 400;
const BASE_INSURANCE_COVERAGE_CENTS = 2500;
const DEFAULT_MARGIN_PERCENT = 25;
const DEFAULT_QUOTE_CACHE_TTL_SECONDS = 300;

export { getSettingNumber };

/** Format cents → "€X.XX" for the pricing step logs. */
function fmt(cents: number): string {
  return `${(cents / 100).toFixed(2)}€`;
}

/**
 * Build the full per-parcel price breakdown from ex-VAT shipping + insurance
 * amounts per the client's Q15.2 formula.
 *
 *   Subtotal = Delivery + Insurance       (both ex-VAT)
 *   VAT      = 21% × Subtotal             (VAT applies to the full subtotal)
 *   Total    = Subtotal + VAT             (what the customer pays)
 *
 * `shippingCents` is the ex-VAT delivery figure (Barcelona matrix value, or
 * SendCloud carrier rate × margin × floor). `insuranceSurchargeCents` is the
 * ex-VAT insurance tier cost — included in the VAT base.
 */
function buildPriceOption({
  shippingCents,
  carrierRateCents,
  marginPercent,
  insuranceSurchargeCents,
  shippingMethodId,
  shippingOptionCode,
  estimatedDays,
}: {
  shippingCents: number;
  carrierRateCents: number;
  marginPercent: number;
  insuranceSurchargeCents: number;
  shippingMethodId: number | null;
  shippingOptionCode?: string | null;
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
    shippingOptionCode: shippingOptionCode ?? null,
    estimatedDays,
  };
}

// ── M2 PRICING API ─────────────────────────────────────────────────────────
// Barcelona internal reads `bcn_price_{band}_{speed}_cents` from admin_settings
// (ex-VAT cents per Q15.2). Rest-of-Spain reads a live SendCloud rate + margin
// + floor (both configurable via admin_settings). Insurance is per-parcel
// and sits inside the VAT base for both routes (Subtotal = Delivery + Insurance).

export type M2DeliverySpeed = "standard" | "express" | "next_day";

export interface BarcelonaPriceInput {
  presetSlug: ParcelPresetSlug;
  speed: M2DeliverySpeed;
  insuranceSurchargeCents?: number;
}

/**
 * Returns Barcelona internal price for one (band, speed) pair or null if the
 * admin hasn't configured that cell yet. Matrix values are stored ex-VAT per
 * Q15.2 — we use the value directly as the delivery figure and `buildPriceOption`
 * adds insurance + VAT on top.
 */
export function getBarcelonaPrice(
  input: BarcelonaPriceInput,
  settings: AdminSettings
): PriceOption | null {
  const key = `bcn_price_${input.presetSlug}_${input.speed}_cents`;
  const shippingExVatCents = getSettingNumber(settings, key, 0);
  if (shippingExVatCents <= 0) {
    console.warn(
      `[pricing] bcn ${input.presetSlug}/${input.speed}: matrix key "${key}" not configured → returning null`
    );
    return null;
  }

  const insuranceSurchargeCents = input.insuranceSurchargeCents ?? 0;

  const option = buildPriceOption({
    shippingCents: shippingExVatCents,
    carrierRateCents: 0,
    marginPercent: 0,
    insuranceSurchargeCents,
    shippingMethodId: null,
    shippingOptionCode: null, // BCN is Laveina's own drivers — no carrier selector.
    estimatedDays: null,
  });

  // Dev-facing pricing trail. Filter server logs by `[pricing] bcn`.
  console.info(`[pricing] bcn ${input.presetSlug}/${input.speed}:`);
  console.info(
    `[pricing]   1. matrix (ex-VAT):   ${shippingExVatCents}c (${fmt(shippingExVatCents)})  key=${key}`
  );
  console.info(
    `[pricing]   2. insurance (ex-VAT): ${insuranceSurchargeCents}c (${fmt(insuranceSurchargeCents)})`
  );
  console.info(
    `[pricing]   3. subtotal:          ${option.subtotalCents}c (${fmt(option.subtotalCents)})`
  );
  console.info(`[pricing]   4. VAT 21%:           ${option.ivaCents}c (${fmt(option.ivaCents)})`);
  console.info(
    `[pricing]   5. TOTAL:             ${option.totalCents}c (${fmt(option.totalCents)})`
  );

  return option;
}

export interface SendcloudBundleParcelInput {
  weightKg: number;
  /** Dimensions forwarded to SendCloud so each carrier applies its own
   *  volumetric rule internally. */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Per-parcel ex-VAT insurance surcharge. Goes into this parcel's VAT base. */
  insuranceSurchargeCents?: number;
}

export interface SendcloudBundlePriceInput {
  parcels: SendcloudBundleParcelInput[];
  speed: M2DeliverySpeed;
  originPostcode: string;
  destinationPostcode: string;
}

/**
 * Split an ex-VAT bundle shipping total proportionally across N parcels by
 * billable weight. Uses floor-then-reconcile so the per-parcel sum equals the
 * bundle total exactly (no rounding drift).
 *
 * If total weight is zero (shouldn't happen — validated upstream), splits
 * evenly.
 */
function splitShippingByWeight(bundleShippingCents: number, parcels: SendcloudBundleParcelInput[]) {
  const totalWeight = parcels.reduce((sum, p) => sum + Math.max(p.weightKg, 0), 0);
  if (parcels.length === 0) return [] as number[];

  if (totalWeight <= 0) {
    const evenShare = Math.floor(bundleShippingCents / parcels.length);
    const shares = parcels.map(() => evenShare);
    shares[shares.length - 1] += bundleShippingCents - evenShare * parcels.length;
    return shares;
  }

  const shares = parcels.map((p) => Math.floor((bundleShippingCents * p.weightKg) / totalWeight));
  const allocated = shares.reduce((s, v) => s + v, 0);
  const remainder = bundleShippingCents - allocated;
  // Put rounding remainder on the heaviest parcel (largest share).
  if (remainder > 0) {
    let heaviestIdx = 0;
    for (let i = 1; i < parcels.length; i++) {
      if (parcels[i].weightKg > parcels[heaviestIdx].weightKg) heaviestIdx = i;
    }
    shares[heaviestIdx] += remainder;
  }
  return shares;
}

/**
 * SendCloud bundled quote for standard/express. `next_day` is Barcelona-only
 * per A2 and always returns null here.
 *
 * Flow (best practice — one carrier, one pickup, one waybill):
 *   1. One `/shipping-options` call with all parcels → bundle carrier rate.
 *   2. Apply margin + floor on the bundle total (ex-VAT) once.
 *   3. Split resulting `shippingCents` across parcels proportionally by weight.
 *   4. Each parcel's `buildPriceOption` adds its own insurance + VAT.
 *
 * Returns one `PriceOption` per input parcel, in the same order. The `carrierRateCents`,
 * `marginPercent`, `shippingOptionCode`, and `estimatedDays` are shared across
 * siblings — they're bundle-level properties, not per-parcel.
 */
export async function getSendcloudBundlePrices(
  input: SendcloudBundlePriceInput,
  settings: AdminSettings
): Promise<PriceOption[] | null> {
  if (input.speed === "next_day") return null;
  if (input.parcels.length === 0) return null;

  const ratesResult = await getAvailableRates({
    parcels: input.parcels.map((p) => ({
      weightKg: p.weightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
    })),
    fromPostalCode: input.originPostcode,
    toPostalCode: input.destinationPostcode,
  });
  if (ratesResult.error) return null;

  const rate = input.speed === "standard" ? ratesResult.data.standard : ratesResult.data.express;
  if (!rate) return null;

  const marginPercent = getSettingNumber(
    settings,
    "sendcloud_margin_percent",
    DEFAULT_MARGIN_PERCENT
  );
  const minShippingCents = getSettingNumber(
    settings,
    "sendcloud_min_shipping_cents",
    DEFAULT_MIN_SHIPPING_CENTS
  );

  // Margin + floor applied ONCE on the bundle total — not per parcel. This
  // prevents a 3-parcel bundle from being forced to 3× floor when the bundle
  // itself already clears the floor.
  const withMargin = Math.round(rate.rateCents * (1 + marginPercent / 100));
  const floorHit = minShippingCents > withMargin;
  const bundleShippingCents = Math.max(minShippingCents, withMargin);

  const perParcelShipping = splitShippingByWeight(bundleShippingCents, input.parcels);

  const options = input.parcels.map((p, idx) =>
    buildPriceOption({
      shippingCents: perParcelShipping[idx],
      carrierRateCents: rate.rateCents,
      marginPercent,
      insuranceSurchargeCents: p.insuranceSurchargeCents ?? 0,
      shippingMethodId: rate.shippingMethodId,
      shippingOptionCode: rate.shippingOptionCode,
      estimatedDays: rate.estimatedDays,
    })
  );

  // Dev-facing pricing trail. Filter by `[pricing] sendcloud`.
  const totalWeight = input.parcels.reduce((s, p) => s + p.weightKg, 0);
  console.info(
    `[pricing] sendcloud ${input.speed} ${input.originPostcode}→${input.destinationPostcode} ${input.parcels.length} parcel(s) ${totalWeight.toFixed(3)}kg:`
  );
  console.info(
    `[pricing]   1. bundle carrier rate:  ${rate.rateCents}c (${fmt(rate.rateCents)})  carrier=${rate.carrier} code=${rate.shippingOptionCode}`
  );
  console.info(
    `[pricing]   2. + margin ${marginPercent}%:           ${withMargin}c (${fmt(withMargin)})`
  );
  console.info(
    `[pricing]   3. floor (min ${minShippingCents}c):      ${bundleShippingCents}c (${fmt(bundleShippingCents)})${floorHit ? "  [FLOOR APPLIED]" : ""}`
  );
  options.forEach((opt, i) => {
    const p = input.parcels[i];
    console.info(
      `[pricing]   4.${i + 1} parcel #${i + 1} (${p.weightKg}kg): shipping ${opt.shippingCents}c (${fmt(opt.shippingCents)}) + insurance ${opt.insuranceSurchargeCents}c → subtotal ${opt.subtotalCents}c → VAT ${opt.ivaCents}c → TOTAL ${opt.totalCents}c (${fmt(opt.totalCents)})`
    );
  });

  return options;
}

/**
 * Resolve a parcel to the (presetSlug, billableWeightKg) pair used for pricing.
 *
 * Weight selection is route-aware:
 *   - `internal` (Barcelona): uses billable weight = max(actual, volumetric).
 *     Protects Laveina's flat-band pricing against oversized-but-light abuse
 *     (e.g. a 55×55×39 box declared at 2 kg should map to Large, not Mini).
 *   - `sendcloud` (Rest of Spain): uses actual weight for preset/band mapping
 *     only. Real dimensions are forwarded separately to SendCloud's v3
 *     `/shipping-options` endpoint (see `getSendcloudPrice`) so each carrier
 *     applies its own volumetric rule server-side.
 *
 * - Preset parcels return the declared weight (ignoring dims since the matrix
 *   is keyed by preset+speed, not weight).
 * - Custom-size parcels pick the smallest preset covering the chosen weight;
 *   returns null if no preset fits (weight > 20 kg).
 */
export interface ResolveParcelInput {
  presetSlug: ParcelPresetSlug | null;
  weightKg: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface ResolvedParcel {
  presetSlug: ParcelPresetSlug;
  billableWeightKg: number;
}

export function resolveParcelForPricing(
  parcel: ResolveParcelInput,
  presets: readonly ParcelPreset[],
  deliveryMode: "internal" | "sendcloud"
): ResolvedParcel | null {
  if (parcel.presetSlug !== null) {
    const preset = presets.find((p) => p.slug === parcel.presetSlug);
    if (!preset) return null;
    return { presetSlug: preset.slug, billableWeightKg: parcel.weightKg };
  }

  const { lengthCm, widthCm, heightCm, weightKg } = parcel;
  if (!lengthCm || !widthCm || !heightCm || !weightKg) return null;

  const pricingWeightKg =
    deliveryMode === "internal"
      ? calcBillableWeightKg(weightKg, lengthCm, widthCm, heightCm)
      : weightKg;

  const preset = findPresetForWeight(pricingWeightKg, presets);
  if (!preset) return null;
  return { presetSlug: preset.slug, billableWeightKg: pricingWeightKg };
}

export interface M2QuoteParcelInput {
  presetSlug: ParcelPresetSlug;
  weightKg: number;
  /** Actual parcel dimensions. Ignored by the BCN path (pricing is keyed by
   *  preset+speed). Forwarded verbatim to SendCloud on the non-BCN path. */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  insuranceSurchargeCents?: number;
}

export interface M2QuoteInput {
  deliveryMode: "internal" | "sendcloud";
  parcels: M2QuoteParcelInput[];
  originPostcode: string;
  destinationPostcode: string;
}

export interface M2ParcelQuote {
  presetSlug: ParcelPresetSlug;
  actualWeightKg: number;
  options: {
    standard: PriceOption | null;
    express: PriceOption | null;
    next_day: PriceOption | null;
  };
}

export interface M2PriceBreakdown {
  deliveryMode: "internal" | "sendcloud";
  parcels: M2ParcelQuote[];
  insuranceCoverageCents: number;
}

/**
 * One-shot quote for the entire order. Returns per-parcel per-speed options.
 *
 * - Barcelona internal: each parcel quoted independently via the admin-editable
 *   matrix (no bundling benefit — there's no carrier involved).
 * - SendCloud: **all parcels sent to SendCloud in a single `/shipping-options`
 *   call per speed**, carrier rate applied to the bundle, then split back to
 *   per-parcel `shippingCents` by weight. Margin + floor land on the bundle
 *   total, not per-parcel. Matches real-world carrier operations (one pickup,
 *   one waybill, N parcels).
 */
export async function quoteShipmentPrices(
  input: M2QuoteInput
): Promise<ApiResponse<M2PriceBreakdown>> {
  const settings = await getAllSettings();

  if (input.parcels.length === 0) {
    return {
      data: null,
      error: { message: "pricing.noParcels", status: 400 },
    };
  }

  if (input.deliveryMode === "internal") {
    const parcels: M2ParcelQuote[] = input.parcels.map((parcel) => ({
      presetSlug: parcel.presetSlug,
      actualWeightKg: parcel.weightKg,
      options: {
        standard: getBarcelonaPrice(
          {
            presetSlug: parcel.presetSlug,
            speed: "standard",
            insuranceSurchargeCents: parcel.insuranceSurchargeCents,
          },
          settings
        ),
        express: getBarcelonaPrice(
          {
            presetSlug: parcel.presetSlug,
            speed: "express",
            insuranceSurchargeCents: parcel.insuranceSurchargeCents,
          },
          settings
        ),
        next_day: getBarcelonaPrice(
          {
            presetSlug: parcel.presetSlug,
            speed: "next_day",
            insuranceSurchargeCents: parcel.insuranceSurchargeCents,
          },
          settings
        ),
      },
    }));

    return {
      data: {
        deliveryMode: "internal",
        parcels,
        insuranceCoverageCents: BASE_INSURANCE_COVERAGE_CENTS,
      },
      error: null,
    };
  }

  // SendCloud bundled flow: one quote call per speed covers all parcels.
  const bundleInput = {
    parcels: input.parcels.map((p) => ({
      weightKg: p.weightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      insuranceSurchargeCents: p.insuranceSurchargeCents,
    })),
    originPostcode: input.originPostcode,
    destinationPostcode: input.destinationPostcode,
  };
  const [standardBundle, expressBundle] = await Promise.all([
    getSendcloudBundlePrices({ ...bundleInput, speed: "standard" }, settings),
    getSendcloudBundlePrices({ ...bundleInput, speed: "express" }, settings),
  ]);

  // SendCloud returned no eligible rates (carrier outage, unserviceable route,
  // or manifest exceeds supported weight/dims). Fail closed so the wizard blocks.
  if (standardBundle === null && expressBundle === null) {
    return {
      data: null,
      error: { message: "pricing.sendcloudUnavailable", status: 503 },
    };
  }

  const parcels: M2ParcelQuote[] = input.parcels.map((parcel, idx) => ({
    presetSlug: parcel.presetSlug,
    actualWeightKg: parcel.weightKg,
    options: {
      standard: standardBundle?.[idx] ?? null,
      express: expressBundle?.[idx] ?? null,
      next_day: null,
    },
  }));

  return {
    data: {
      deliveryMode: "sendcloud",
      parcels,
      insuranceCoverageCents: BASE_INSURANCE_COVERAGE_CENTS,
    },
    error: null,
  };
}

export function getQuoteCacheTtlSeconds(settings: AdminSettings): number {
  return getSettingNumber(
    settings,
    "sendcloud_quote_cache_ttl_seconds",
    DEFAULT_QUOTE_CACHE_TTL_SECONDS
  );
}

// ── LEGACY API (removed) ──────────────────────────────────────────────────
// The pre-M2 `getRates()` + `/api/shipments/get-rates` endpoint has been
// removed. M2 pricing reads `bcn_price_{preset}_{speed}_cents` directly
// inside `/api/shipments/create-checkout` and `quoteShipmentPrices()` — no
// callers remain for the old `internal_price_{tier}_cents` keys.
