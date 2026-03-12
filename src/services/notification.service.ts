import type { ApiResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GALLABOX_API_URL = process.env.GALLABOX_API_URL!;
const GALLABOX_API_KEY = process.env.GALLABOX_API_KEY!;
const GALLABOX_API_SECRET = process.env.GALLABOX_API_SECRET!;

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Sends a WhatsApp template message via Gallabox API.
 */
async function sendWhatsAppMessage(
  phone: string,
  templateName: string,
  templateParams: Record<string, string>,
): Promise<ApiResponse<{ messageId: string }>> {
  // TODO: Format phone number to international format (e.g. +60...)
  // TODO: POST to Gallabox API endpoint with:
  //   - Authorization headers (API key + secret)
  //   - Body: { phone, templateName, templateParams }
  // TODO: Handle API errors and return ApiResponse
  // TODO: Return { messageId } from response

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// sendShipmentConfirmation
// ---------------------------------------------------------------------------

/**
 * Sends a WhatsApp message to the sender confirming shipment creation.
 * Includes tracking ID, pickup point details, and estimated cost.
 */
export async function sendShipmentConfirmation(params: {
  senderPhone: string;
  senderName: string;
  trackingId: string;
  originPickupPointName: string;
  destinationPickupPointName: string;
  priceCents: number;
}): Promise<ApiResponse<{ messageId: string }>> {
  // TODO: Build template params from input
  // TODO: Call sendWhatsAppMessage with "shipment_confirmation" template
  // TODO: Return the result

  const { senderPhone, senderName, trackingId, originPickupPointName, destinationPickupPointName, priceCents } = params;

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// sendStatusUpdate
// ---------------------------------------------------------------------------

/**
 * Sends a WhatsApp message notifying the customer of a shipment status change.
 * Sent to both sender and receiver depending on the status.
 */
export async function sendStatusUpdate(params: {
  phone: string;
  recipientName: string;
  trackingId: string;
  oldStatus: ShipmentStatus;
  newStatus: ShipmentStatus;
}): Promise<ApiResponse<{ messageId: string }>> {
  // TODO: Map newStatus to a human-readable message
  // TODO: Call sendWhatsAppMessage with "status_update" template
  // TODO: Return the result

  const { phone, recipientName, trackingId, oldStatus, newStatus } = params;

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// sendOtpMessage
// ---------------------------------------------------------------------------

/**
 * Sends a WhatsApp message containing the OTP code for delivery verification.
 */
export async function sendOtpMessage(
  phone: string,
  otp: string,
): Promise<ApiResponse<{ messageId: string }>> {
  // TODO: Call sendWhatsAppMessage with "delivery_otp" template
  // TODO: Pass { otp } as template params
  // TODO: Return the result

  throw new Error("Not implemented");
}
