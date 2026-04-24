import { getTranslations } from "next-intl/server";

import {
  isChannelAllowed,
  isMandatoryTemplate,
  type NotificationTemplate,
} from "@/constants/notification-prefs";
import { WHATSAPP_TEMPLATES } from "@/constants/notifications";
import { sendWhatsAppMessage } from "@/lib/gallabox/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";

// A10 (client answer 2026-04-21): customers can opt out of non-mandatory
// notifications via `/customer/notifications`. Every public sender here
// checks the customer's prefs first; mandatory templates
// (order_confirmation, ready_for_pickup, pickup_otp) bypass the check.
//
// Receiver-facing templates (pickup_otp, ready_for_pickup, delivery receiver
// copy) always fire — receivers don't have accounts and these are
// operationally critical.

async function logNotification(params: {
  shipmentId: string;
  recipientPhone: string;
  templateName: string;
  status: "sent" | "failed";
  messageId?: string;
}) {
  try {
    const supabase = createAdminClient();
    await supabase.from("notifications_log").insert({
      shipment_id: params.shipmentId,
      recipient_phone: params.recipientPhone,
      template_name: params.templateName,
      status: params.status,
      gallabox_message_id: params.messageId ?? null,
      sent_at: params.status === "sent" ? new Date().toISOString() : null,
    });
  } catch {
    // Non-critical — don't break the main flow
  }
}

type NotificationResult = ApiResponse<{ messageId: string }>;

/**
 * Resolves the shipment's customer and checks whether they allow the given
 * WhatsApp template to fire. Defaults to "allowed" when anything goes wrong
 * — we'd rather over-notify on infra hiccups than silently drop messages
 * the customer actually wants.
 */
async function isWhatsappAllowedForShipment(
  shipmentId: string,
  template: NotificationTemplate
): Promise<boolean> {
  if (isMandatoryTemplate(template)) return true;

  try {
    const supabase = createAdminClient();
    const { data: shipment } = await supabase
      .from("shipments")
      .select("customer_id")
      .eq("id", shipmentId)
      .maybeSingle();

    if (!shipment?.customer_id) return true;

    const { data: prefsRow } = await supabase
      .from("notification_preferences")
      .select("prefs")
      .eq("customer_id", shipment.customer_id)
      .maybeSingle();

    return isChannelAllowed(prefsRow?.prefs, template, "whatsapp");
  } catch (err) {
    console.error("prefs gate failed, defaulting to allow:", err);
    return true;
  }
}

/** Stable "skipped" result for when prefs block an optional notification. */
function skippedByPrefs(template: NotificationTemplate): NotificationResult {
  return { data: { messageId: `skipped:prefs:${template}` }, error: null };
}

/** Sends a WhatsApp template and logs the result. All public functions delegate here. */
async function sendAndLog(params: {
  shipmentId: string;
  phone: string;
  templateName: string;
  templateParams: Array<{ name: string; value: string }>;
}): Promise<NotificationResult> {
  try {
    const result = await sendWhatsAppMessage(
      params.phone,
      params.templateName,
      params.templateParams
    );

    void logNotification({
      shipmentId: params.shipmentId,
      recipientPhone: params.phone,
      templateName: params.templateName,
      status: "sent",
      messageId: result.id,
    });

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";

    void logNotification({
      shipmentId: params.shipmentId,
      recipientPhone: params.phone,
      templateName: params.templateName,
      status: "failed",
    });

    return { data: null, error: { message, status: 500 } };
  }
}

export async function sendShipmentConfirmation(params: {
  shipmentId: string;
  senderPhone: string;
  senderName: string;
  trackingId: string;
  originPickupPointName: string;
  destinationPickupPointName: string;
  priceCents: number;
}): Promise<NotificationResult> {
  // order_confirmation is mandatory per A10 — gate returns true, call fires.
  // Kept for documentation + future-proofing.
  const allowed = await isWhatsappAllowedForShipment(params.shipmentId, "order_confirmation");
  if (!allowed) return skippedByPrefs("order_confirmation");

  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.senderPhone,
    templateName: WHATSAPP_TEMPLATES.SHIPMENT_CONFIRMATION,
    templateParams: [
      { name: "sender_name", value: params.senderName },
      { name: "tracking_id", value: params.trackingId },
      { name: "origin", value: params.originPickupPointName },
      { name: "destination", value: params.destinationPickupPointName },
      { name: "price", value: (params.priceCents / 100).toFixed(2) },
    ],
  });
}

export async function sendReceivedAtOrigin(params: {
  shipmentId: string;
  senderPhone: string;
  senderName: string;
  trackingId: string;
  shopName: string;
}): Promise<NotificationResult> {
  // Classified as shipment_update (operational progress, not a mandatory
  // transactional receipt) — gated by prefs.
  const allowed = await isWhatsappAllowedForShipment(params.shipmentId, "shipment_update");
  if (!allowed) return skippedByPrefs("shipment_update");

  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.senderPhone,
    templateName: WHATSAPP_TEMPLATES.RECEIVED_AT_ORIGIN,
    templateParams: [
      { name: "sender_name", value: params.senderName },
      { name: "tracking_id", value: params.trackingId },
      { name: "shop_name", value: params.shopName },
    ],
  });
}

export async function sendInTransit(params: {
  shipmentId: string;
  senderPhone: string;
  senderName: string;
  trackingId: string;
}): Promise<NotificationResult> {
  const allowed = await isWhatsappAllowedForShipment(params.shipmentId, "in_transit");
  if (!allowed) return skippedByPrefs("in_transit");

  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.senderPhone,
    templateName: WHATSAPP_TEMPLATES.IN_TRANSIT,
    templateParams: [
      { name: "sender_name", value: params.senderName },
      { name: "tracking_id", value: params.trackingId },
    ],
  });
}

export async function sendReadyForPickup(params: {
  shipmentId: string;
  receiverPhone: string;
  receiverName: string;
  trackingId: string;
  shopName: string;
  shopAddress: string;
}): Promise<NotificationResult> {
  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.receiverPhone,
    templateName: WHATSAPP_TEMPLATES.READY_FOR_PICKUP,
    templateParams: [
      { name: "receiver_name", value: params.receiverName },
      { name: "tracking_id", value: params.trackingId },
      { name: "shop_name", value: params.shopName },
      { name: "shop_address", value: params.shopAddress },
    ],
  });
}

export async function sendOtpMessage(
  phone: string,
  otp: string,
  shipmentId: string
): Promise<NotificationResult> {
  return sendAndLog({
    shipmentId,
    phone,
    templateName: WHATSAPP_TEMPLATES.OTP_VERIFICATION,
    templateParams: [{ name: "otp", value: otp }],
  });
}

export async function sendDeliveryToSender(params: {
  shipmentId: string;
  senderPhone: string;
  senderName: string;
  trackingId: string;
}): Promise<NotificationResult> {
  const allowed = await isWhatsappAllowedForShipment(params.shipmentId, "delivered");
  if (!allowed) return skippedByPrefs("delivered");

  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.senderPhone,
    templateName: WHATSAPP_TEMPLATES.DELIVERY_SENDER,
    templateParams: [
      { name: "sender_name", value: params.senderName },
      { name: "tracking_id", value: params.trackingId },
    ],
  });
}

export async function sendDeliveryToReceiver(params: {
  shipmentId: string;
  receiverPhone: string;
  receiverName: string;
  trackingId: string;
}): Promise<NotificationResult> {
  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.receiverPhone,
    templateName: WHATSAPP_TEMPLATES.DELIVERY_RECEIVER,
    templateParams: [
      { name: "receiver_name", value: params.receiverName },
      { name: "tracking_id", value: params.trackingId },
    ],
  });
}

/** Generic status update for SendCloud webhook status changes. */
export async function sendStatusUpdate(params: {
  shipmentId: string;
  phone: string;
  recipientName: string;
  trackingId: string;
  oldStatus: ShipmentStatus;
  newStatus: ShipmentStatus;
  /** Customer's preferred locale — accepted for API compatibility but
   *  currently ignored: A8 (Laveina M2 Answers Final) locks M2 WhatsApp to
   *  Spanish, so the status label below always resolves via `es`. Remove
   *  this override once multilingual WhatsApp templates are approved. */
  locale?: string | null;
}): Promise<NotificationResult> {
  const allowed = await isWhatsappAllowedForShipment(params.shipmentId, "shipment_update");
  if (!allowed) return skippedByPrefs("shipment_update");

  // A8 — force Spanish for WhatsApp status label at M2 launch.
  const tStatus = await getTranslations({
    locale: "es",
    namespace: "shipmentStatus",
  });
  const statusLabel = tStatus(params.newStatus);

  return sendAndLog({
    shipmentId: params.shipmentId,
    phone: params.phone,
    templateName: WHATSAPP_TEMPLATES.IN_TRANSIT,
    templateParams: [
      { name: "recipient_name", value: params.recipientName },
      { name: "tracking_id", value: params.trackingId },
      { name: "new_status", value: statusLabel },
    ],
  });
}
