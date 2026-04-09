import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { getClientIp, paymentLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRates } from "@/services/pricing.service";
import { getDeliveryMode } from "@/services/routing.service";
import type { PriceBreakdown } from "@/types/shipment";
import { createCheckoutSchema } from "@/validations/shipment.schema";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = paymentLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const booking = parsed.data;

    const routing = getDeliveryMode(booking.origin_postcode, booking.destination_postcode);

    if (routing.mode === "blocked") {
      return NextResponse.json({ error: "routing.blocked" }, { status: 422 });
    }

    // Calculate rates — tier is auto-detected from billable weight
    const rateResults = await Promise.all(
      booking.parcels.map((parcel) =>
        getRates({
          deliveryMode: routing.mode,
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

    type ParcelPricingItem = {
      detectedTier: string;
      weightKg: number;
      insuranceOptionId: string | null;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
      breakdown: PriceBreakdown;
      selectedTotalCents: number;
    };

    let grandTotalCents = 0;
    const parcelPricing: ParcelPricingItem[] = booking.parcels.map((parcel, i) => {
      // SAFETY: errors filtered out above
      const breakdown = rateResults[i].data as PriceBreakdown;
      const selectedOption =
        booking.delivery_speed === "express" && breakdown.express
          ? breakdown.express
          : breakdown.standard;

      grandTotalCents += selectedOption.totalCents;

      return {
        detectedTier: breakdown.detectedTier,
        weightKg: parcel.weight_kg,
        insuranceOptionId: parcel.insurance_option_id,
        lengthCm: parcel.length_cm,
        widthCm: parcel.width_cm,
        heightCm: parcel.height_cm,
        breakdown,
        selectedTotalCents: selectedOption.totalCents,
      };
    });

    // Stored separately — Stripe metadata has a 500-char limit
    const bookingData = {
      customer_id: user.id,
      contact: {
        sender_name: booking.sender_name,
        sender_phone: booking.sender_phone,
        receiver_name: booking.receiver_name,
        receiver_phone: booking.receiver_phone,
      },
      locations: {
        origin_postcode: booking.origin_postcode,
        origin_pickup_point_id: booking.origin_pickup_point_id,
        destination_postcode: booking.destination_postcode,
        destination_pickup_point_id: booking.destination_pickup_point_id,
      },
      delivery_mode: routing.mode,
      delivery_speed: booking.delivery_speed,
      parcels: parcelPricing.map((pp) => {
        const selectedOption =
          booking.delivery_speed === "express" && pp.breakdown.express
            ? pp.breakdown.express
            : pp.breakdown.standard;

        return {
          parcel_size: pp.detectedTier,
          weight_kg: pp.weightKg,
          billable_weight_kg: pp.breakdown.billableWeightKg,
          length_cm: pp.lengthCm,
          width_cm: pp.widthCm,
          height_cm: pp.heightCm,
          insurance_option_id: pp.insuranceOptionId,
          insurance_amount_cents: pp.breakdown.insuranceCoverageCents,
          insurance_surcharge_cents: selectedOption.insuranceSurchargeCents,
          price_cents: selectedOption.totalCents,
          carrier_rate_cents: selectedOption.carrierRateCents,
          margin_percent: selectedOption.marginPercent,
          shipping_method_id: selectedOption.shippingMethodId,
        };
      }),
    };

    const adminClient = createAdminClient();
    const { data: pendingBooking, error: pendingError } = await adminClient
      .from("pending_bookings")
      .insert({ customer_id: user.id, booking_data: bookingData })
      .select("id")
      .single();

    if (pendingError || !pendingBooking) {
      console.error("Failed to create pending booking:", pendingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const parcelCount = booking.parcels.length;

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name:
                parcelCount === 1
                  ? "Laveina — Parcel Shipment"
                  : `Laveina — ${parcelCount} Parcel Shipments`,
              description: booking.parcels.map((p) => `${p.weight_kg} kg`).join(", "),
            },
            unit_amount: grandTotalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book`,
      customer_email: user.email,
      metadata: {
        pending_booking_id: pendingBooking.id,
        customer_id: user.id,
        parcel_count: String(parcelCount),
      },
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
