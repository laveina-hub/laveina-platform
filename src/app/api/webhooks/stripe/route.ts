import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { env } from "@/env";
import { generateAndUploadQrCode } from "@/lib/qr/generator";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewBookingPaid } from "@/services/admin-notification.service";
import { logAuditEvent } from "@/services/audit.service";
import { sendShipmentConfirmation } from "@/services/notification.service";
import { createShipment, setShipmentQrCodeUrl } from "@/services/shipment.service";
import { ShipmentStatus } from "@/types/enums";
import type { CreateShipmentInput } from "@/types/shipment";

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
      const success = await handleCheckoutCompleted(event.id, event.data.object);
      if (!success) {
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

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
        parcel_size: z.enum(["tier_1", "tier_2", "tier_3", "tier_4", "tier_5", "tier_6"]),
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

async function handleCheckoutCompleted(
  eventId: string,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const meta = session.metadata;

  if (!meta) {
    console.error("Stripe webhook: checkout.session.completed has no metadata", session.id);
    return true;
  }

  const pendingBookingId = meta.pending_booking_id;
  const customerId = meta.customer_id;
  const stripeSessionId = session.id;
  const stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!customerId) {
    console.error("Stripe webhook: missing customer_id in metadata", session.id);
    return true;
  }

  const supabase = createAdminClient();

  if (!pendingBookingId) {
    console.error("Stripe webhook: missing pending_booking_id in metadata", session.id);
    return true;
  }

  const { data: pendingBooking, error: fetchError } = await supabase
    .from("pending_bookings")
    .select("booking_data, processed")
    .eq("id", pendingBookingId)
    .single();

  if (fetchError || !pendingBooking) {
    console.error("Stripe webhook: pending booking not found", pendingBookingId, fetchError);
    return true;
  }

  const parsed = pendingBookingDataSchema.safeParse(pendingBooking.booking_data);

  if (!parsed.success) {
    console.error(
      "Stripe webhook: booking_data failed validation",
      pendingBookingId,
      parsed.error.flatten()
    );
    return true;
  }

  const bookingData: PendingBookingData = parsed.data;

  // Atomic claim: only one webhook delivery wins
  const { data: claimed } = await supabase
    .from("pending_bookings")
    .update({ processed: true, stripe_event_id: eventId })
    .eq("id", pendingBookingId)
    .eq("processed", false)
    .select("id")
    .single();

  if (!claimed) {
    console.warn(
      "Stripe webhook: pending booking already claimed (concurrent delivery or retry)",
      pendingBookingId,
      eventId
    );
    return true;
  }

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

  if (creationFailed) {
    for (const shipment of createdShipments) {
      await supabase.from("shipments").delete().eq("id", shipment.id);
    }

    await supabase.from("pending_bookings").update({ processed: false }).eq("id", pendingBookingId);

    console.error(
      "Stripe webhook: rolled back partial booking",
      pendingBookingId,
      `${createdShipments.length} shipments deleted`
    );
    return false;
  }

  // Use admin client directly — updateShipmentStatus uses server client (no cookies in webhooks)
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
    },
  });

  // Notify admin of new bookings
  void Promise.allSettled(createdShipments.map((s) => notifyNewBookingPaid(s.id, s.tracking_id)));

  await Promise.allSettled(
    createdShipments.map(async (shipment) => {
      try {
        const qrUrl = await generateAndUploadQrCode(shipment.tracking_id);
        await setShipmentQrCodeUrl(shipment.id, qrUrl);
      } catch (err) {
        console.error(`Stripe webhook: QR code generation failed for ${shipment.tracking_id}`, err);
      }
    })
  );

  // Send WhatsApp confirmation for each shipment
  const { data: originPoint } = await supabase
    .from("pickup_points")
    .select("name")
    .eq("id", bookingData.locations.origin_pickup_point_id)
    .single();

  const { data: destPoint } = await supabase
    .from("pickup_points")
    .select("name")
    .eq("id", bookingData.locations.destination_pickup_point_id)
    .single();

  void Promise.allSettled(
    createdShipments.map((shipment) => {
      const parcel = bookingData.parcels[createdShipments.indexOf(shipment)];
      return sendShipmentConfirmation({
        shipmentId: shipment.id,
        senderPhone: bookingData.contact.sender_phone,
        senderName: bookingData.contact.sender_name,
        trackingId: shipment.tracking_id,
        originPickupPointName: originPoint?.name ?? "",
        destinationPickupPointName: destPoint?.name ?? "",
        priceCents: parcel?.price_cents ?? 0,
      });
    })
  );

  return true;
}
