import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getRates } from "@/services/pricing.service";
import { getDeliveryMode } from "@/services/routing.service";
import type { PriceBreakdown } from "@/types/shipment";
import {
  bookingStepOriginSchema,
  bookingStepDestinationSchema,
} from "@/validations/shipment.schema";

const parcelRateItemSchema = z.object({
  parcel_size: z.enum(["small", "medium", "large", "extra_large", "xxl"]),
  weight_kg: z.number().positive().max(25),
  length_cm: z.number().int().positive(),
  width_cm: z.number().int().positive(),
  height_cm: z.number().int().positive(),
  insurance_option_id: z.string().uuid().nullable(),
});

const getRatesBodySchema = z.object({
  origin_postcode: bookingStepOriginSchema.shape.origin_postcode,
  destination_postcode: bookingStepDestinationSchema.shape.destination_postcode,
  parcels: z.array(parcelRateItemSchema).min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = publicLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const body = await request.json();
    const parsed = getRatesBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { origin_postcode, destination_postcode, parcels } = parsed.data;

    const routing = getDeliveryMode(origin_postcode, destination_postcode);

    if (routing.mode === "blocked") {
      return NextResponse.json({ error: routing.reason }, { status: 422 });
    }

    const rateResults = await Promise.all(
      parcels.map((parcel) =>
        getRates({
          deliveryMode: routing.mode,
          parcelSize: parcel.parcel_size,
          weightKg: parcel.weight_kg,
          lengthCm: parcel.length_cm,
          widthCm: parcel.width_cm,
          heightCm: parcel.height_cm,
          insuranceOptionId: parcel.insurance_option_id,
        })
      )
    );

    for (const result of rateResults) {
      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.status });
      }
    }

    // SAFETY: errors filtered out above
    const breakdowns = rateResults.map((r) => r.data as PriceBreakdown);

    return NextResponse.json({ data: breakdowns });
  } catch (err) {
    console.error("POST /api/shipments/get-rates failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
