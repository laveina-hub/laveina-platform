import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { env } from "@/env";
import { generateAndUploadQrCode } from "@/lib/qr/generator";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/services/audit.service";
import {
  createShipment,
  setShipmentQrCodeUrl,
  updateShipmentStatus,
} from "@/services/shipment.service";
import { ShipmentStatus } from "@/types/enums";
import type { CreateShipmentInput } from "@/types/shipment";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. On checkout.session.completed:
 *   1. Reads full booking data from pending_bookings table.
 *   2. Creates one shipment per parcel (each with own tracking ID + QR code).
 *   3. Marks the pending booking as processed.
 *
 * Supports multi-parcel bookings (one payment, multiple shipments).
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 });
    }
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(event.data.object);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

// ─── Zod schema for pending booking data validation ─────────────────────────

const pendingBookingDataSchema = z.object({
  customer_id: z.string().uuid(),
  contact: z.object({
    sender_name: z.string().min(1),
    sender_phone: z.string().min(1),
    receiver_name: z.string().min(1),
    receiver_phone: z.string().min(1),
  }),
  locations: z.object({
    origin_postcode: z.string().regex(/^[0-9]{5}$/),
    origin_pickup_point_id: z.string().uuid(),
    destination_postcode: z.string().regex(/^[0-9]{5}$/),
    destination_pickup_point_id: z.string().uuid(),
  }),
  delivery_mode: z.enum(["internal", "sendcloud"]),
  delivery_speed: z.enum(["standard", "express"]),
  parcels: z
    .array(
      z.object({
        parcel_size: z.enum(["small", "medium", "large", "extra_large", "xxl"]),
        weight_kg: z.number().positive(),
        billable_weight_kg: z.number().nonnegative(),
        length_cm: z.number().positive(),
        width_cm: z.number().positive(),
        height_cm: z.number().positive(),
        insurance_option_id: z.string().uuid().nullable(),
        insurance_amount_cents: z.number().nonnegative(),
        insurance_surcharge_cents: z.number().nonnegative(),
        price_cents: z.number().positive(),
        carrier_rate_cents: z.number().nonnegative(),
        margin_percent: z.number().nonnegative(),
        shipping_method_id: z.number().nullable(),
      })
    )
    .min(1),
});

type PendingBookingData = z.infer<typeof pendingBookingDataSchema>;

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata;

  if (!meta) {
    console.error("Stripe webhook: checkout.session.completed has no metadata", session.id);
    return;
  }

  const pendingBookingId = meta.pending_booking_id;
  const customerId = meta.customer_id;
  const stripeSessionId = session.id;
  const stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!customerId) {
    console.error("Stripe webhook: missing customer_id in metadata", session.id);
    return;
  }

  // ── Read booking data from pending_bookings ────────────────────────────────
  const supabase = createAdminClient();

  if (!pendingBookingId) {
    console.error("Stripe webhook: missing pending_booking_id in metadata", session.id);
    return;
  }

  const { data: pendingBooking, error: fetchError } = await supabase
    .from("pending_bookings")
    .select("booking_data, processed")
    .eq("id", pendingBookingId)
    .single();

  if (fetchError || !pendingBooking) {
    console.error("Stripe webhook: pending booking not found", pendingBookingId, fetchError);
    return;
  }

  // Validate booking_data shape with Zod instead of unsafe cast
  const parsed = pendingBookingDataSchema.safeParse(pendingBooking.booking_data);

  if (!parsed.success) {
    console.error(
      "Stripe webhook: booking_data failed validation",
      pendingBookingId,
      parsed.error.flatten()
    );
    return;
  }

  const bookingData: PendingBookingData = parsed.data;

  // ── Atomically claim the booking to prevent duplicate processing ──────────
  // If two webhook deliveries race, only one will succeed at this update.
  const { data: claimed } = await supabase
    .from("pending_bookings")
    .update({ processed: true })
    .eq("id", pendingBookingId)
    .eq("processed", false)
    .select("id")
    .single();

  if (!claimed) {
    console.warn(
      "Stripe webhook: pending booking already claimed (concurrent delivery)",
      pendingBookingId
    );
    return;
  }

  // ── Create one shipment per parcel ─────────────────────────────────────────
  // All parcels must succeed. If any fails, roll back by unclaiming the
  // pending booking so Stripe can retry the webhook.

  const createdShipments: Array<{ id: string; tracking_id: string }> = [];
  let creationFailed = false;

  for (const parcel of bookingData.parcels) {
    const input: CreateShipmentInput = {
      sender_name: bookingData.contact.sender_name,
      sender_phone: bookingData.contact.sender_phone,
      receiver_name: bookingData.contact.receiver_name,
      receiver_phone: bookingData.contact.receiver_phone,
      origin_postcode: bookingData.locations.origin_postcode,
      origin_pickup_point_id: bookingData.locations.origin_pickup_point_id,
      destination_postcode: bookingData.locations.destination_postcode,
      destination_pickup_point_id: bookingData.locations.destination_pickup_point_id,
      parcel_size: parcel.parcel_size,
      weight_kg: parcel.weight_kg,
      billable_weight_kg: parcel.billable_weight_kg,
      parcel_length_cm: parcel.length_cm,
      parcel_width_cm: parcel.width_cm,
      parcel_height_cm: parcel.height_cm,
      delivery_mode: bookingData.delivery_mode,
      delivery_speed: bookingData.delivery_speed,
      price_cents: parcel.price_cents,
      carrier_rate_cents: parcel.carrier_rate_cents || null,
      margin_percent: parcel.margin_percent || null,
      shipping_method_id: parcel.shipping_method_id,
      insurance_option_id: parcel.insurance_option_id,
      insurance_amount_cents: parcel.insurance_amount_cents,
      insurance_surcharge_cents: parcel.insurance_surcharge_cents,
      stripe_checkout_session_id: stripeSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,
    };

    const shipmentResult = await createShipment(customerId, input);

    if (shipmentResult.error) {
      console.error(
        "Stripe webhook: failed to create shipment, rolling back",
        shipmentResult.error
      );
      creationFailed = true;
      break;
    }

    createdShipments.push({
      id: shipmentResult.data.id,
      tracking_id: shipmentResult.data.tracking_id,
    });
  }

  // If any parcel failed, roll back: delete created shipments and unclaim booking
  if (creationFailed) {
    for (const shipment of createdShipments) {
      await supabase.from("shipments").delete().eq("id", shipment.id);
    }

    // Unclaim the pending booking so the webhook can be retried by Stripe
    await supabase.from("pending_bookings").update({ processed: false }).eq("id", pendingBookingId);

    console.error(
      "Stripe webhook: rolled back partial booking",
      pendingBookingId,
      `${createdShipments.length} shipments deleted`
    );
    return;
  }

  // ── Transition shipments to waiting_at_origin ─────────────────────────────
  // Per PARCEL_JOURNEY.md: after payment, shipments should be waiting_at_origin
  for (const shipment of createdShipments) {
    await updateShipmentStatus(shipment.id, ShipmentStatus.WAITING_AT_ORIGIN);
  }

  // ── Audit log: payment completed ─────────────────────────────────────────
  void logAuditEvent({
    actor_id: customerId,
    action: "payment.completed",
    resource: "shipment",
    resource_id: pendingBookingId,
    metadata: {
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,
      parcel_count: createdShipments.length,
      tracking_ids: createdShipments.map((s) => s.tracking_id),
      amount_total: session.amount_total,
      currency: session.currency,
    },
  });

  // ── Generate QR codes for all successfully created shipments ───────────────
  for (const shipment of createdShipments) {
    try {
      const qrUrl = await generateAndUploadQrCode(shipment.tracking_id);
      await setShipmentQrCodeUrl(shipment.id, qrUrl);
    } catch (err) {
      console.error(`Stripe webhook: QR code generation failed for ${shipment.tracking_id}`, err);
    }
  }

  // Note: pending booking was already marked processed via atomic claim above.
}
