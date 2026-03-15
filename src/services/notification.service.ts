import { sendWhatsAppMessage } from "@/lib/gallabox/client";
import type { ApiResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";

export async function sendShipmentConfirmation(params: {
  senderPhone: string;
  senderName: string;
  trackingId: string;
  originPickupPointName: string;
  destinationPickupPointName: string;
  priceCents: number;
}): Promise<ApiResponse<{ messageId: string }>> {
  try {
    const result = await sendWhatsAppMessage(params.senderPhone, "shipment_confirmation", [
      { name: "sender_name", value: params.senderName },
      { name: "tracking_id", value: params.trackingId },
      { name: "origin", value: params.originPickupPointName },
      { name: "destination", value: params.destinationPickupPointName },
      { name: "price", value: (params.priceCents / 100).toFixed(2) },
    ]);

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";
    return { data: null, error: { message, status: 500 } };
  }
}

export async function sendStatusUpdate(params: {
  phone: string;
  recipientName: string;
  trackingId: string;
  oldStatus: ShipmentStatus;
  newStatus: ShipmentStatus;
}): Promise<ApiResponse<{ messageId: string }>> {
  try {
    const result = await sendWhatsAppMessage(params.phone, "status_update", [
      { name: "recipient_name", value: params.recipientName },
      { name: "tracking_id", value: params.trackingId },
      { name: "new_status", value: params.newStatus },
    ]);

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";
    return { data: null, error: { message, status: 500 } };
  }
}

export async function sendOtpMessage(
  phone: string,
  otp: string
): Promise<ApiResponse<{ messageId: string }>> {
  try {
    const result = await sendWhatsAppMessage(phone, "otp_verification", [
      { name: "otp", value: otp },
    ]);

    return { data: { messageId: result.id }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send WhatsApp message";
    return { data: null, error: { message, status: 500 } };
  }
}
