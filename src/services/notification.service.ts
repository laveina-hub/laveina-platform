import { STATUS_DISPLAY_LABELS, WHATSAPP_TEMPLATES } from "@/constants/notifications";
import { sendWhatsAppMessage } from "@/lib/gallabox/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";

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
}): Promise<NotificationResult> {
  const statusLabel = STATUS_DISPLAY_LABELS[params.newStatus] ?? params.newStatus;

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
