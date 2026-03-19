import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { getRates } from "@/services/pricing.service";
import { getDeliveryMode } from "@/services/routing.service";
import { createCheckoutSchema } from "@/validations/shipment.schema";

/**
 * POST /api/shipments/create-checkout
 *
 * Validates the full booking payload, recalculates price server-side (client
 * price is NEVER trusted), then creates a Stripe Checkout session.
 *
 * All booking data is embedded in session metadata — the Stripe webhook handler
 * creates the shipment row after payment is confirmed.
 *
 * Auth required — only authenticated customers can book.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate payload ──────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const booking = parsed.data;

    // ── Routing ───────────────────────────────────────────────────────────────
    const routing = getDeliveryMode(booking.origin_postcode, booking.destination_postcode);

    if (routing.mode === "blocked") {
      return NextResponse.json({ error: "routing.blocked" }, { status: 422 });
    }

    // ── Fetch parcel size config for dimensions ───────────────────────────────
    const { data: sizeConfig, error: sizeError } = await supabase
      .from("parcel_size_config")
      .select("length_cm, width_cm, height_cm, max_weight_kg")
      .eq("size", booking.parcel_size)
      .eq("is_active", true)
      .single();

    if (sizeError || !sizeConfig) {
      return NextResponse.json({ error: "pricing.sizeNotFound" }, { status: 422 });
    }

    if (booking.weight_kg > sizeConfig.max_weight_kg) {
      return NextResponse.json({ error: "pricing.weightExceedsMax" }, { status: 422 });
    }

    // ── Server-side price recalculation (client price is NEVER trusted) ───────
    const ratesResult = await getRates({
      deliveryMode: routing.mode,
      parcelSize: booking.parcel_size,
      weightKg: booking.weight_kg,
      lengthCm: sizeConfig.length_cm,
      widthCm: sizeConfig.width_cm,
      heightCm: sizeConfig.height_cm,
      insuranceOptionId: booking.insurance_option_id,
    });

    if (ratesResult.error) {
      return NextResponse.json(
        { error: ratesResult.error.message },
        { status: ratesResult.error.status }
      );
    }

    const priceBreakdown = ratesResult.data;
    const selectedOption =
      booking.delivery_speed === "express" && priceBreakdown.express
        ? priceBreakdown.express
        : priceBreakdown.standard;

    // ── Create Stripe Checkout session ────────────────────────────────────────
    const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Laveina — Parcel Shipment",
              description: `${booking.parcel_size} · ${booking.weight_kg} kg · ${routing.mode}`,
            },
            // totalCents already includes IVA
            unit_amount: selectedOption.totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book`,
      customer_email: user.email,
      metadata: {
        // Identity
        customer_id: user.id,
        // Contact
        sender_name: booking.sender_name,
        sender_phone: booking.sender_phone,
        receiver_name: booking.receiver_name,
        receiver_phone: booking.receiver_phone,
        // Locations
        origin_postcode: booking.origin_postcode,
        origin_pickup_point_id: booking.origin_pickup_point_id,
        destination_postcode: booking.destination_postcode,
        destination_pickup_point_id: booking.destination_pickup_point_id,
        // Parcel
        parcel_size: booking.parcel_size,
        weight_kg: String(booking.weight_kg),
        billable_weight_kg: String(priceBreakdown.billableWeightKg),
        parcel_length_cm: String(sizeConfig.length_cm),
        parcel_width_cm: String(sizeConfig.width_cm),
        parcel_height_cm: String(sizeConfig.height_cm),
        // Delivery
        delivery_mode: routing.mode,
        delivery_speed: booking.delivery_speed,
        // Pricing snapshot (all cents as strings — Stripe metadata is string-only)
        price_cents: String(selectedOption.totalCents),
        carrier_rate_cents: String(selectedOption.carrierRateCents),
        margin_percent: String(selectedOption.marginPercent),
        shipping_method_id: selectedOption.shippingMethodId
          ? String(selectedOption.shippingMethodId)
          : "",
        insurance_option_id: booking.insurance_option_id ?? "",
        insurance_amount_cents: String(priceBreakdown.insuranceCoverageCents),
        insurance_surcharge_cents: String(selectedOption.insuranceSurchargeCents),
      },
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating checkout session:", message);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
