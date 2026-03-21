import { sendWhatsAppMessage } from "@/lib/gallabox/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";

/** Logs notification attempts for audit. Uses admin client to bypass RLS. */
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
    });
  } catch {
    // Logging failure should never break the main flow
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
}): Promise<ApiResponse<{ messageId: string }>> {
  const templateName = "shipment_confirmation";
  try {
    const result = await sendWhatsAppMessage(params.senderPhone, templateName, [
      { name: "sender_name", value: params.senderName },
      { name: "tracking_id", value: params.trackingId },
      { name: "origin", value: params.originPickupPointName },
      { name: "destination", value: params.destinationPickupPointName },
      { name: "price", value: (params.priceCents / 100).toFixed(2) },
    ]);

    void logNotification({
      shipmentId: params.shipmentId,
      recipientPhone: params.senderPhone,
      templateName,
      status: "sent",
      messageId: result.id,
    });

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";

    void logNotification({
      shipmentId: params.shipmentId,
      recipientPhone: params.senderPhone,
      templateName,
      status: "failed",
    });

    return { data: null, error: { message, status: 500 } };
  }
}

export async function sendStatusUpdate(params: {
  shipmentId?: string;
  phone: string;
  recipientName: string;
  trackingId: string;
  oldStatus: ShipmentStatus;
  newStatus: ShipmentStatus;
}): Promise<ApiResponse<{ messageId: string }>> {
  const templateName = "status_update";
  try {
    const result = await sendWhatsAppMessage(params.phone, templateName, [
      { name: "recipient_name", value: params.recipientName },
      { name: "tracking_id", value: params.trackingId },
      { name: "new_status", value: params.newStatus },
    ]);

    if (params.shipmentId) {
      void logNotification({
        shipmentId: params.shipmentId,
        recipientPhone: params.phone,
        templateName,
        status: "sent",
        messageId: result.id,
      });
    }

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";

    if (params.shipmentId) {
      void logNotification({
        shipmentId: params.shipmentId,
        recipientPhone: params.phone,
        templateName,
        status: "failed",
      });
    }

    return { data: null, error: { message, status: 500 } };
  }
}

export async function sendOtpMessage(
  phone: string,
  otp: string,
  shipmentId?: string
): Promise<ApiResponse<{ messageId: string }>> {
  const templateName = "otp_verification";
  try {
    const result = await sendWhatsAppMessage(phone, templateName, [{ name: "otp", value: otp }]);

    if (shipmentId) {
      void logNotification({
        shipmentId,
        recipientPhone: phone,
        templateName,
        status: "sent",
        messageId: result.id,
      });
    }

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";

    if (shipmentId) {
      void logNotification({
        shipmentId,
        recipientPhone: phone,
        templateName,
        status: "failed",
      });
    }

    return { data: null, error: { message, status: 500 } };
  }
}
