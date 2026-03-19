import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRates } from "@/services/pricing.service";
import { getDeliveryMode } from "@/services/routing.service";
import {
  bookingStepOriginSchema,
  bookingStepDestinationSchema,
  bookingStepParcelSchema,
} from "@/validations/shipment.schema";

const getRatesBodySchema = z.object({
  origin_postcode: bookingStepOriginSchema.shape.origin_postcode,
  destination_postcode: bookingStepDestinationSchema.shape.destination_postcode,
  parcel_size: bookingStepParcelSchema.shape.parcel_size,
  weight_kg: bookingStepParcelSchema.shape.weight_kg,
  // Dimensions come from the selected parcel_size_config row (resolved client-side)
  length_cm: z.number().int().positive(),
  width_cm: z.number().int().positive(),
  height_cm: z.number().int().positive(),
  insurance_option_id: bookingStepParcelSchema.shape.insurance_option_id,
});

/**
 * POST /api/shipments/get-rates
 *
 * Calculates shipping rates for a given booking combination.
 * Returns standard + express PriceOption objects (express is null for internal routes).
 * Called by the booking form Step 4→5 transition.
 * Auth required — only authenticated customers can get rates.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = getRatesBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      origin_postcode,
      destination_postcode,
      parcel_size,
      weight_kg,
      length_cm,
      width_cm,
      height_cm,
      insurance_option_id,
    } = parsed.data;

    const routing = getDeliveryMode(origin_postcode, destination_postcode);

    if (routing.mode === "blocked") {
      return NextResponse.json({ error: routing.reason }, { status: 422 });
    }

    const result = await getRates({
      deliveryMode: routing.mode,
      parcelSize: parcel_size,
      weightKg: weight_kg,
      lengthCm: length_cm,
      widthCm: width_cm,
      heightCm: height_cm,
      insuranceOptionId: insurance_option_id,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
