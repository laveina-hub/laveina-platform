import type { ApiResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";

const GALLABOX_API_URL = process.env.GALLABOX_API_URL!;
const GALLABOX_API_KEY = process.env.GALLABOX_API_KEY!;
const GALLABOX_API_SECRET = process.env.GALLABOX_API_SECRET!;

async function sendWhatsAppMessage(
  phone: string,
  templateName: string,
  templateParams: Record<string, string>
): Promise<ApiResponse<{ messageId: string }>> {
  throw new Error("Not implemented");
}

export async function sendShipmentConfirmation(params: {
  senderPhone: string;
  senderName: string;
  trackingId: string;
  originPickupPointName: string;
  destinationPickupPointName: string;
  priceCents: number;
}): Promise<ApiResponse<{ messageId: string }>> {
  const {
    senderPhone,
    senderName,
    trackingId,
    originPickupPointName,
    destinationPickupPointName,
    priceCents,
  } = params;

  throw new Error("Not implemented");
}

export async function sendStatusUpdate(params: {
  phone: string;
  recipientName: string;
  trackingId: string;
  oldStatus: ShipmentStatus;
  newStatus: ShipmentStatus;
}): Promise<ApiResponse<{ messageId: string }>> {
  const { phone, recipientName, trackingId, oldStatus, newStatus } = params;

  throw new Error("Not implemented");
}

export async function sendOtpMessage(
  phone: string,
  otp: string
): Promise<ApiResponse<{ messageId: string }>> {
  throw new Error("Not implemented");
}
