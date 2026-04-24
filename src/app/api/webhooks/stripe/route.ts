import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { DEFAULT_PARCEL_PRESETS } from "@/constants/parcel-preset-defaults";
import { env } from "@/env";
import { generateAndUploadQrCode } from "@/lib/qr/generator";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewBookingPaid } from "@/services/admin-notification.service";
import { logAuditEvent } from "@/services/audit.service";
import {
  sendBookingNotificationToReceiverEmail,
  sendShipmentConfirmationEmail,
} from "@/services/email-templates.service";
import { sendShipmentConfirmation } from "@/services/notification.service";
import { pendingBookingV2Schema, type PendingBookingV2 } from "@/services/pending-booking";
import { createShipment, setShipmentQrCodeUrl } from "@/services/shipment.service";
import { ShipmentStatus } from "@/types/enums";
import type { CreateShipmentInput } from "@/types/shipment";
import { presetToLegacyTier } from "@/types/shipment";

// Stripe checkout.session.completed handler — M2 shape.
// Contract is signed via the `version: "m2"` tag on booking_data. Legacy rows
// (unversioned) are rejected with a log so they don't silently fail in prod.

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

  if (event.type === "checkout.session.completed") {
    const success = await handleCheckoutCompleted(event.id, event.data.object);
    if (!success) {
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  eventId: string,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const meta = session.metadata;
  if (!meta) {
    console.error("Stripe webhook: no metadata on session", session.id);
    return true;
  }

  const pendingBookingId = meta.pending_booking_id;
  const customerId = meta.customer_id;

  if (!pendingBookingId || !customerId) {
    console.error("Stripe webhook: metadata missing ids", session.id, meta);
    return true;
  }

  const stripeSessionId = session.id;
  const stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  const supabase = createAdminClient();

  const { data: pendingBooking, error: fetchError } = await supabase
    .from("pending_bookings")
    .select("booking_data, processed")
    .eq("id", pendingBookingId)
    .single();

  if (fetchError || !pendingBooking) {
    console.error("Stripe webhook: pending booking not found", pendingBookingId, fetchError);
    return true;
  }

  const parsed = pendingBookingV2Schema.safeParse(pendingBooking.booking_data);
  if (!parsed.success) {
    console.error(
      "Stripe webhook: booking_data failed M2 validation",
      pendingBookingId,
      parsed.error.flatten()
    );
    return true;
  }

  const bookingData: PendingBookingV2 = parsed.data;

  // Atomic claim — only one delivery wins. If already processed, short-circuit
  // success (Stripe may retry on network errors).
  const { data: claimed } = await supabase
    .from("pending_bookings")
    .update({ processed: true, stripe_event_id: eventId })
    .eq("id", pendingBookingId)
    .eq("processed", false)
    .select("id")
    .single();

  if (!claimed) {
    console.warn(
      "Stripe webhook: pending booking already claimed (retry or concurrent delivery)",
      pendingBookingId,
      eventId
    );
    return true;
  }

  const createdShipments: Array<{ id: string; tracking_id: string }> = [];
  let creationFailed = false;
  let failureMessage: string | null = null;

  for (const parcel of bookingData.parcels) {
    // Resolve preset dims from local defaults so we never trust wire-supplied
    // values on the hot insert path (the DB CHECK constraints would catch any
    // abuse, but hard-coding the intended dimensions is clearer).
    const preset = DEFAULT_PARCEL_PRESETS.find((p) => p.slug === parcel.preset_slug);
    if (!preset) {
      creationFailed = true;
      failureMessage = `unknown preset slug: ${parcel.preset_slug}`;
      break;
    }

    const input: CreateShipmentInput = {
      sender_first_name: bookingData.sender.first_name,
      sender_last_name: bookingData.sender.last_name,
      sender_phone: bookingData.sender.phone,
      sender_whatsapp: bookingData.sender.whatsapp,
      sender_email: bookingData.sender.email,

      receiver_first_name: bookingData.receiver.first_name,
      receiver_last_name: bookingData.receiver.last_name,
      receiver_phone: bookingData.receiver.phone,
      receiver_whatsapp: bookingData.receiver.whatsapp,
      receiver_email: bookingData.receiver.email,

      origin_pickup_point_id: bookingData.origin.pickup_point_id,
      destination_pickup_point_id: bookingData.destination.pickup_point_id,
      origin_postcode: bookingData.origin.postcode,
      destination_postcode: bookingData.destination.postcode,

      parcel_size: presetToLegacyTier(parcel.preset_slug),
      parcel_preset_slug: parcel.preset_slug,
      weight_kg: parcel.weight_kg,
      billable_weight_kg: parcel.weight_kg,
      parcel_length_cm: preset.lengthCm,
      parcel_width_cm: preset.widthCm,
      parcel_height_cm: preset.heightCm,

      delivery_mode: bookingData.delivery_mode,
      delivery_speed: bookingData.actual_speed,

      // `parcel.price_cents` already includes shipping + insurance + VAT
      // per Q15.2 (see create-checkout). No further addition needed.
      price_cents: parcel.price_cents,
      carrier_rate_cents: parcel.carrier_rate_cents,
      margin_percent: parcel.margin_percent,
      shipping_method_id: parcel.shipping_method_id,
      shipping_option_code: parcel.shipping_option_code ?? null,

      insurance_option_id: null,
      insurance_amount_cents: parcel.declared_value_cents,
      insurance_surcharge_cents: parcel.insurance_cost_cents,

      stripe_checkout_session_id: stripeSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,

      preferred_locale: bookingData.locale ?? "es",
    };

    const shipmentResult = await createShipment(customerId, input);

    if (shipmentResult.error) {
      creationFailed = true;
      failureMessage = shipmentResult.error.message;
      console.error("Stripe webhook: createShipment failed — rolling back", shipmentResult.error);
      break;
    }

    createdShipments.push({
      id: shipmentResult.data.id,
      tracking_id: shipmentResult.data.tracking_id,
    });
  }

  if (creationFailed) {
    for (const shipment of createdShipments) {
      await supabase.from("shipments").delete().eq("id", shipment.id);
    }
    // Release the claim so Stripe retries land on a fresh attempt.
    await supabase.from("pending_bookings").update({ processed: false }).eq("id", pendingBookingId);

    console.error(
      "Stripe webhook: rolled back partial booking",
      pendingBookingId,
      `${createdShipments.length} shipments deleted`,
      failureMessage
    );
    return false;
  }

  // Advance every shipment to waiting_at_origin — state-machine trigger
  // accepts payment_confirmed → waiting_at_origin transition.
  await Promise.all(
    createdShipments.map((shipment) =>
      supabase
        .from("shipments")
        .update({ status: ShipmentStatus.WAITING_AT_ORIGIN })
        .eq("id", shipment.id)
    )
  );

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
      actual_speed: bookingData.actual_speed,
      delivery_mode: bookingData.delivery_mode,
    },
  });

  void Promise.allSettled(createdShipments.map((s) => notifyNewBookingPaid(s.id, s.tracking_id)));

  // QR + confirmation notifications run best-effort so a single failure
  // doesn't block the other shipments.
  await Promise.allSettled(
    createdShipments.map(async (shipment) => {
      try {
        const qrUrl = await generateAndUploadQrCode(shipment.tracking_id);
        await setShipmentQrCodeUrl(shipment.id, qrUrl);
      } catch (err) {
        console.error(`Stripe webhook: QR generation failed for ${shipment.tracking_id}`, err);
      }
    })
  );

  const [{ data: originPoint }, { data: destPoint }] = await Promise.all([
    supabase
      .from("pickup_points")
      .select("name")
      .eq("id", bookingData.origin.pickup_point_id)
      .single(),
    supabase
      .from("pickup_points")
      .select("name, address")
      .eq("id", bookingData.destination.pickup_point_id)
      .single(),
  ]);

  const senderName = `${bookingData.sender.first_name} ${bookingData.sender.last_name}`.trim();
  const receiverName =
    `${bookingData.receiver.first_name} ${bookingData.receiver.last_name}`.trim();
  const bookingLocale = bookingData.locale ?? null;

  void Promise.allSettled(
    createdShipments.flatMap((shipment, i) => {
      const parcel = bookingData.parcels[i];
      // `parcel.price_cents` is the full per-parcel total paid (incl. VAT +
      // insurance) per Q15.2. Matches `shipments.price_cents` stored above.
      const priceCents = parcel?.price_cents ?? 0;
      return [
        sendShipmentConfirmation({
          shipmentId: shipment.id,
          senderPhone: bookingData.sender.phone,
          senderName,
          trackingId: shipment.tracking_id,
          originPickupPointName: originPoint?.name ?? "",
          destinationPickupPointName: destPoint?.name ?? "",
          priceCents,
        }),
        sendShipmentConfirmationEmail({
          shipmentId: shipment.id,
          to: bookingData.sender.email,
          senderName,
          trackingId: shipment.tracking_id,
          origin: originPoint?.name ?? "",
          destination: destPoint?.name ?? "",
          priceCents,
          deliverySpeed: bookingData.actual_speed ?? undefined,
          locale: bookingLocale,
        }),
        // Q3.4 — initial notification to the receiver at booking time.
        sendBookingNotificationToReceiverEmail({
          shipmentId: shipment.id,
          to: bookingData.receiver.email,
          receiverName,
          senderName,
          trackingId: shipment.tracking_id,
          originName: originPoint?.name ?? "",
          destinationName: destPoint?.name ?? "",
          destinationAddress: destPoint?.address ?? "",
          locale: bookingLocale,
        }),
      ];
    })
  );

  return true;
}
