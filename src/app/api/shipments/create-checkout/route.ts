import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { getClientIp, paymentLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { getRates } from "@/services/pricing.service";
import { getDeliveryMode } from "@/services/routing.service";
import type { ParcelSize } from "@/types/enums";
import type { PriceBreakdown } from "@/types/shipment";
import { createCheckoutSchema } from "@/validations/shipment.schema";

/**
 * POST /api/shipments/create-checkout
 *
 * Validates the full booking payload, recalculates prices server-side,
 * stores booking data in pending_bookings, then creates a Stripe Checkout
 * session. Supports multiple parcels per booking.
 *
 * Auth required — only authenticated customers can book.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = paymentLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

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

    // ── Fetch all size configs in parallel ───────────────────────────────────
    const uniqueSizes = [...new Set(booking.parcels.map((p) => p.parcel_size))];
    const sizeConfigResults = await Promise.all(
      uniqueSizes.map((size) =>
        supabase
          .from("parcel_size_config")
          .select("size, length_cm, width_cm, height_cm, max_weight_kg")
          .eq("size", size)
          .eq("is_active", true)
          .single()
      )
    );

    const sizeConfigMap = new Map<
      string,
      { length_cm: number; width_cm: number; height_cm: number; max_weight_kg: number }
    >();
    for (const { data: cfg, error: err } of sizeConfigResults) {
      if (err || !cfg) {
        return NextResponse.json({ error: "pricing.sizeNotFound" }, { status: 422 });
      }
      sizeConfigMap.set(cfg.size, cfg);
    }

    // Validate weights against size configs
    for (const parcel of booking.parcels) {
      const cfg = sizeConfigMap.get(parcel.parcel_size);
      if (!cfg || parcel.weight_kg > cfg.max_weight_kg) {
        return NextResponse.json({ error: "pricing.weightExceedsMax" }, { status: 422 });
      }
    }

    // ── Calculate prices for each parcel in parallel ─────────────────────────
    const rateResults = await Promise.all(
      booking.parcels.map((parcel) => {
        const cfg = sizeConfigMap.get(parcel.parcel_size)!;
        return getRates({
          deliveryMode: routing.mode,
          parcelSize: parcel.parcel_size,
          weightKg: parcel.weight_kg,
          lengthCm: cfg.length_cm,
          widthCm: cfg.width_cm,
          heightCm: cfg.height_cm,
          insuranceOptionId: parcel.insurance_option_id,
        });
      })
    );

    for (const result of rateResults) {
      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.status });
      }
    }

    type ParcelPricingItem = {
      parcelSize: ParcelSize;
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
      const cfg = sizeConfigMap.get(parcel.parcel_size)!;
      // SAFETY: error results are filtered out above — only success results remain here
      const breakdown = rateResults[i].data as PriceBreakdown;
      const selectedOption =
        booking.delivery_speed === "express" && breakdown.express
          ? breakdown.express
          : breakdown.standard;

      grandTotalCents += selectedOption.totalCents;

      return {
        parcelSize: parcel.parcel_size,
        weightKg: parcel.weight_kg,
        insuranceOptionId: parcel.insurance_option_id,
        lengthCm: cfg.length_cm,
        widthCm: cfg.width_cm,
        heightCm: cfg.height_cm,
        breakdown,
        selectedTotalCents: selectedOption.totalCents,
      };
    });

    // ── Store booking data in pending_bookings ────────────────────────────────
    // This avoids Stripe metadata size limits and supports multi-parcel.
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
          parcel_size: pp.parcelSize,
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

    const { data: pendingBooking, error: pendingError } = await supabase
      .from("pending_bookings")
      .insert({ customer_id: user.id, booking_data: bookingData })
      .select("id")
      .single();

    if (pendingError || !pendingBooking) {
      console.error("Failed to create pending booking:", pendingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // ── Create Stripe Checkout session ────────────────────────────────────────
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
              description: booking.parcels
                .map((p) => `${p.parcel_size} · ${p.weight_kg} kg`)
                .join(", "),
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
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating checkout session:", message);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
