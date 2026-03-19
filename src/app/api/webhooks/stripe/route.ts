import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { env } from "@/env";
import { generateAndUploadQrCode } from "@/lib/qr/generator";
import { getStripe } from "@/lib/stripe/client";
import { createShipment, setShipmentQrCodeUrl } from "@/services/shipment.service";
import type { DeliveryMode, DeliverySpeed, ParcelSize } from "@/types/enums";
import type { CreateShipmentInput } from "@/types/shipment";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. On checkout.session.completed:
 *   1. Reconstructs CreateShipmentInput from session metadata.
 *   2. Creates shipment row (DB trigger auto-generates tracking_id).
 *   3. Generates QR code PNG, uploads to Supabase Storage.
 *   4. Updates shipment.qr_code_url.
 *
 * Idempotency: Stripe may deliver events more than once. The shipment insert
 * is keyed on stripe_checkout_session_id — duplicate inserts will be rejected
 * by the unique constraint and the webhook will return 200 anyway.
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
      // Acknowledge all other events without action
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata;

  if (!meta) {
    console.error("Stripe webhook: checkout.session.completed has no metadata", session.id);
    return;
  }

  const customerId = meta.customer_id;
  const stripeSessionId = session.id;
  const stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!customerId) {
    console.error("Stripe webhook: missing customer_id in metadata", session.id);
    return;
  }

  const input: CreateShipmentInput = {
    // Contact
    sender_name: meta.sender_name ?? "",
    sender_phone: meta.sender_phone ?? "",
    receiver_name: meta.receiver_name ?? "",
    receiver_phone: meta.receiver_phone ?? "",
    // Locations
    origin_postcode: meta.origin_postcode ?? "",
    origin_pickup_point_id: meta.origin_pickup_point_id ?? "",
    destination_postcode: meta.destination_postcode ?? "",
    destination_pickup_point_id: meta.destination_pickup_point_id ?? "",
    // Parcel
    // SAFETY: values come from our own validated metadata — types are known
    parcel_size: meta.parcel_size as ParcelSize,
    weight_kg: parseFloat(meta.weight_kg ?? "0"),
    billable_weight_kg: parseFloat(meta.billable_weight_kg ?? "0"),
    parcel_length_cm: parseInt(meta.parcel_length_cm ?? "0", 10),
    parcel_width_cm: parseInt(meta.parcel_width_cm ?? "0", 10),
    parcel_height_cm: parseInt(meta.parcel_height_cm ?? "0", 10),
    // Delivery
    // SAFETY: values come from our own validated metadata — types are known
    delivery_mode: meta.delivery_mode as DeliveryMode,
    delivery_speed: meta.delivery_speed as DeliverySpeed,
    // Pricing snapshot
    price_cents: parseInt(meta.price_cents ?? "0", 10),
    carrier_rate_cents: meta.carrier_rate_cents ? parseInt(meta.carrier_rate_cents, 10) : null,
    margin_percent: meta.margin_percent ? parseFloat(meta.margin_percent) : null,
    shipping_method_id: meta.shipping_method_id ? parseInt(meta.shipping_method_id, 10) : null,
    insurance_option_id: meta.insurance_option_id || null,
    insurance_amount_cents: parseInt(meta.insurance_amount_cents ?? "0", 10),
    insurance_surcharge_cents: parseInt(meta.insurance_surcharge_cents ?? "0", 10),
    // Payment
    stripe_checkout_session_id: stripeSessionId,
    stripe_payment_intent_id: stripePaymentIntentId,
  };

  const shipmentResult = await createShipment(customerId, input);

  if (shipmentResult.error) {
    console.error("Stripe webhook: failed to create shipment", shipmentResult.error);
    return;
  }

  const shipment = shipmentResult.data;

  // Generate and upload QR code asynchronously
  try {
    const qrUrl = await generateAndUploadQrCode(shipment.tracking_id);
    await setShipmentQrCodeUrl(shipment.id, qrUrl);
  } catch (err) {
    // QR generation failure is non-fatal — shipment exists, QR can be regenerated
    console.error("Stripe webhook: QR code generation failed", err);
  }
}
