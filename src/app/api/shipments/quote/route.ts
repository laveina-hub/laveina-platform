import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { listActivePresets } from "@/services/parcel-preset.service";
import { quoteShipmentPrices, resolvePricingLines } from "@/services/pricing.service";
import { getDeliveryMode } from "@/services/routing.service";
import type { PriceOption } from "@/types/shipment";
import { quoteRequestSchema } from "@/validations/shipment.schema";

// POST /api/shipments/quote — server-authoritative quote for both Barcelona
// internal (fixed matrix) and Rest-of-Spain (SendCloud live rate + margin
// + floor + VAT).
//
// Contract:
//   - Public (no auth) — prices visible before login per the marketing flow.
//   - Rate-limited via publicLimiter (60/min per IP).
//   - Accepts custom-dimension parcels: L×W×H → volumetric → billable weight
//     → preset band used for SendCloud weight and BCN matrix lookup.
//   - Multi-parcel bookings (1-5 parcels) are quoted as ONE bundle for
//     SendCloud routes — single /shipping-options call, carrier rate split
//     across parcels by weight. Matches real-world carrier operations (one
//     pickup, one waybill, N parcels).
//   - Returns per-parcel per-speed PriceOption plus aggregated totals so the
//     UI can render a live summary without duplicating the math.
//   - Fail-closed on SendCloud outage: returns 503 so the wizard blocks
//     Continue until retry succeeds.

type PerParcelQuote = {
  parcel_index: number;
  preset_slug: string;
  billable_weight_kg: number;
  insurance_surcharge_cents: number;
  options: {
    standard: PriceOption | null;
    express: PriceOption | null;
    next_day: PriceOption | null;
  };
};

type AggregatedTotals = {
  standard: number | null;
  express: number | null;
  next_day: number | null;
};

function sumOption(
  parcels: PerParcelQuote[],
  speed: "standard" | "express" | "next_day"
): number | null {
  let total = 0;
  for (const parcel of parcels) {
    const option = parcel.options[speed];
    if (!option) return null;
    total += option.totalCents;
  }
  return total;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = publicLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const body = await request.json().catch(() => null);
    const parsed = quoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const routing = getDeliveryMode(input.origin_postcode, input.destination_postcode);
    if (routing.mode === "blocked") {
      return NextResponse.json({ error: "route.blocked", reason: routing.reason }, { status: 422 });
    }

    const presetsResult = await listActivePresets();
    if (presetsResult.error || presetsResult.data.length === 0) {
      return NextResponse.json({ error: "presets.notConfigured" }, { status: 503 });
    }
    const presets = presetsResult.data;

    // Resolve every parcel to its preset band + billable weight + dimensions
    // before calling the pricing service. Surfaces unresolvable parcels as a
    // 422 before we waste a SendCloud API call.
    const resolution = resolvePricingLines(input.parcels, presets, routing.mode);
    if (!resolution.ok) {
      return NextResponse.json(
        { error: "parcel.unresolvable", parcel_index: resolution.parcelIndex },
        { status: 422 }
      );
    }
    const resolved = resolution.lines;

    const quote = await quoteShipmentPrices({
      deliveryMode: routing.mode,
      parcels: resolved.map((r) => ({
        presetSlug: r.presetSlug,
        weightKg: r.billableWeightKg,
        lengthCm: r.lengthCm,
        widthCm: r.widthCm,
        heightCm: r.heightCm,
        insuranceSurchargeCents: r.insuranceCostCents,
      })),
      originPostcode: input.origin_postcode,
      destinationPostcode: input.destination_postcode,
    });

    if (quote.error) {
      const status = quote.error.message === "pricing.sendcloudUnavailable" ? 503 : 422;
      return NextResponse.json({ error: quote.error.message }, { status });
    }

    const perParcel: PerParcelQuote[] = quote.data.parcels.map((p, i) => ({
      parcel_index: resolved[i].index,
      preset_slug: p.presetSlug,
      billable_weight_kg: p.actualWeightKg,
      insurance_surcharge_cents: resolved[i].insuranceCostCents,
      options: p.options,
    }));

    const totals: AggregatedTotals = {
      standard: sumOption(perParcel, "standard"),
      express: sumOption(perParcel, "express"),
      next_day: routing.mode === "internal" ? sumOption(perParcel, "next_day") : null,
    };

    return NextResponse.json({
      data: {
        delivery_mode: routing.mode,
        origin_postcode: input.origin_postcode,
        destination_postcode: input.destination_postcode,
        quoted_at: new Date().toISOString(),
        parcels: perParcel,
        totals,
      },
    });
  } catch (err) {
    console.error("quote: unexpected error", err);
    return NextResponse.json({ error: "quote.internalError" }, { status: 500 });
  }
}
