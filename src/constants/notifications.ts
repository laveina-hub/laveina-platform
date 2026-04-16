import type { ShipmentStatus } from "@/types/enums";

/** Template names must match what's configured in the Gallabox dashboard. */

export const WHATSAPP_TEMPLATES = {
  SHIPMENT_CONFIRMATION: "shipment_confirmation",
  RECEIVED_AT_ORIGIN: "parcel_received_at_origin",
  IN_TRANSIT: "parcel_in_transit",
  READY_FOR_PICKUP: "parcel_ready_for_pickup",
  OTP_VERIFICATION: "otp_verification",
  DELIVERY_SENDER: "delivery_confirmation_sender",
  DELIVERY_RECEIVER: "delivery_confirmation_receiver",
} as const;

export type WhatsAppTemplate = (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES];

export const GALLABOX_MAX_RETRIES = 2;
export const GALLABOX_RETRY_BASE_DELAY_MS = 1000;

/** Friendly labels for WhatsApp messages (instead of raw enum values). */
export const STATUS_DISPLAY_LABELS: Record<ShipmentStatus, string> = {
  payment_confirmed: "Pago confirmado",
  waiting_at_origin: "Esperando en origen",
  received_at_origin: "Recibido en origen",
  in_transit: "En tránsito",
  arrived_at_destination: "Llegado al destino",
  ready_for_pickup: "Listo para recoger",
  delivered: "Entregado",
};
