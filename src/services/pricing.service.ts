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

export interface SendcloudParcelInput {
  weightKg: number;
  /** Dimensions forwarded to SendCloud so each carrier applies its own
   *  volumetric rule internally. */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Per-parcel ex-VAT insurance surcharge. Goes into this parcel's VAT base. */
  insuranceSurchargeCents?: number;
}

export interface SendcloudPriceInput {
  parcels: SendcloudParcelInput[];
  speed: M2DeliverySpeed;
  originPostcode: string;
  destinationPostcode: string;
}

/**
 * SendCloud per-parcel quote for standard/express. `next_day` is Barcelona-only
 * per A2 and always returns null here.
 *
 * Why per-parcel and not bundled: SendCloud's `/shipping-options` endpoint
 * accepts a parcels array but the returned `quotes.price.total` is *not* a
 * reliable multi-parcel bundle total — most Spanish carriers (Correos, SEUR,
 * MRW, GLS, InPost) price and dispatch one label per parcel. Sending all
 * parcels in one call returned single-parcel-equivalent rates that, when
 * split, undercharged customers by 5-10×. We now ask SendCloud once per
 * parcel so each gets its own real, weight/dim-aware rate.
 *
 * Flow per parcel:
 *   1. One `/shipping-options` call → carrier rate for that parcel.
 *   2. Apply margin → apply floor (€4 default) — both per parcel.
 *   3. `buildPriceOption` adds insurance + VAT.
 *
 * Returns one `PriceOption` per input parcel, in the same order. Returns null
 * if any parcel's rate fetch fails — fail-closed so the wizard blocks rather
 * than partially quoting.
 */
export async function getSendcloudParcelPrices(
  input: SendcloudPriceInput,
  settings: AdminSettings
): Promise<PriceOption[] | null> {
  if (input.speed === "next_day") return null;
  if (input.parcels.length === 0) return null;

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

  const options: PriceOption[] = [];
  for (let i = 0; i < input.parcels.length; i++) {
    const parcel = input.parcels[i];

    const ratesResult = await getAvailableRates({
      parcels: [
        {
          weightKg: parcel.weightKg,
          lengthCm: parcel.lengthCm,
          widthCm: parcel.widthCm,
          heightCm: parcel.heightCm,
        },
      ],
      fromPostalCode: input.originPostcode,
      toPostalCode: input.destinationPostcode,
    });
    if (ratesResult.error) return null;

    const rate = input.speed === "standard" ? ratesResult.data.standard : ratesResult.data.express;
    if (!rate) return null;

    const withMargin = Math.round(rate.rateCents * (1 + marginPercent / 100));
    const floorHit = minShippingCents > withMargin;
    const shippingCents = Math.max(minShippingCents, withMargin);

    const opt = buildPriceOption({
      shippingCents,
      carrierRateCents: rate.rateCents,
      marginPercent,
      insuranceSurchargeCents: parcel.insuranceSurchargeCents ?? 0,
      shippingMethodId: rate.shippingMethodId,
      shippingOptionCode: rate.shippingOptionCode,
      estimatedDays: rate.estimatedDays,
    });
    options.push(opt);

    console.info(
      `[pricing] sendcloud ${input.speed} ${input.originPostcode}→${input.destinationPostcode} parcel #${i + 1} (${parcel.weightKg}kg):`
    );
    console.info(
      `[pricing]   1. carrier rate:        ${rate.rateCents}c (${fmt(rate.rateCents)})  carrier=${rate.carrier} code=${rate.shippingOptionCode}`
    );
    console.info(
      `[pricing]   2. + margin ${marginPercent}%:         ${withMargin}c (${fmt(withMargin)})`
    );
    console.info(
      `[pricing]   3. floor (min ${minShippingCents}c):    ${shippingCents}c (${fmt(shippingCents)})${floorHit ? "  [FLOOR APPLIED]" : ""}`
    );
    console.info(
      `[pricing]   4. + insurance ${opt.insuranceSurchargeCents}c → subtotal ${opt.subtotalCents}c → VAT ${opt.ivaCents}c → TOTAL ${opt.totalCents}c (${fmt(opt.totalCents)})`
    );
  }

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

    // BCN band-upgrade safety net: pricing on internal routes is keyed by
    // (presetSlug, speed), so a user who picks "Mini" but edits the parcel
    // weight to 18 kg would otherwise pay Mini's flat rate for a Large-tier
    // parcel. Promote to the smallest band that fits the billable weight
    // (max of actual vs. volumetric) so the matrix charges the right cell.
    // SendCloud is rate-based — the carrier price scales with weight + dims
    // already — so the upgrade is a no-op there and we keep the user's
    // chosen slug for display.
    if (deliveryMode === "internal") {
      const lengthCm = parcel.lengthCm ?? preset.lengthCm;
      const widthCm = parcel.widthCm ?? preset.widthCm;
      const heightCm = parcel.heightCm ?? preset.heightCm;
      const billableWeightKg = calcBillableWeightKg(parcel.weightKg, lengthCm, widthCm, heightCm);
      if (billableWeightKg > preset.maxWeightKg) {
        const upgraded = findPresetForWeight(billableWeightKg, presets);
        if (!upgraded) return null;
        return { presetSlug: upgraded.slug, billableWeightKg };
      }
    }

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
 * - SendCloud: each parcel quoted independently via its own `/shipping-options`
 *   call per speed. Margin + floor apply per parcel. SendCloud's bundle quote
 *   doesn't reliably scale across parcels for Spanish carriers (they price and
 *   dispatch one label per parcel), so we ask once per parcel and sum.
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

  // SendCloud per-parcel flow: each parcel gets its own /shipping-options
  // call per speed (see getSendcloudParcelPrices for the rationale).
  const sendcloudInput = {
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
  const [standardPrices, expressPrices] = await Promise.all([
    getSendcloudParcelPrices({ ...sendcloudInput, speed: "standard" }, settings),
    getSendcloudParcelPrices({ ...sendcloudInput, speed: "express" }, settings),
  ]);

  // SendCloud returned no eligible rates (carrier outage, unserviceable route,
  // or manifest exceeds supported weight/dims). Fail closed so the wizard blocks.
  if (standardPrices === null && expressPrices === null) {
    return {
      data: null,
      error: { message: "pricing.sendcloudUnavailable", status: 503 },
    };
  }

  const parcels: M2ParcelQuote[] = input.parcels.map((parcel, idx) => ({
    presetSlug: parcel.presetSlug,
    actualWeightKg: parcel.weightKg,
    options: {
      standard: standardPrices?.[idx] ?? null,
      express: expressPrices?.[idx] ?? null,
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
