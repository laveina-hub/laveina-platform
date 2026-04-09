import type { Database } from "./database.types";
import type { DeliveryMode, DeliverySpeed, ParcelSize } from "./enums";

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];
export type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export type ShipmentWithRelations = Shipment & {
  origin_pickup_point: Database["public"]["Tables"]["pickup_points"]["Row"];
  destination_pickup_point: Database["public"]["Tables"]["pickup_points"]["Row"];
  customer: Database["public"]["Tables"]["profiles"]["Row"];
  scan_logs: Database["public"]["Tables"]["scan_logs"]["Row"][];
};

export type PublicTrackingData = {
  tracking_id: string;
  status: string;
  created_at: string;
  parcel_size: string;
  delivery_mode: string;
  delivery_speed: string;
  carrier_name: string | null;
  carrier_tracking_number: string | null;
  origin_pickup_point: { name: string; city: string } | null;
  destination_pickup_point: { name: string; city: string } | null;
  scan_logs: { new_status: string; scanned_at: string }[];
};

export type CreateShipmentInput = {
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  origin_pickup_point_id: string;
  destination_pickup_point_id: string;
  origin_postcode: string;
  destination_postcode: string;
  parcel_size: ParcelSize;
  weight_kg: number;
  billable_weight_kg: number;
  parcel_length_cm: number;
  parcel_width_cm: number;
  parcel_height_cm: number;
  delivery_mode: DeliveryMode;
  delivery_speed: DeliverySpeed;
  price_cents: number;
  carrier_rate_cents: number | null;
  margin_percent: number | null;
  shipping_method_id: number | null;
  insurance_option_id: string | null;
  insurance_amount_cents: number;
  insurance_surcharge_cents: number;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
};

export type PriceOption = {
  shippingCents: number;
  carrierRateCents: number;
  marginPercent: number;
  insuranceSurchargeCents: number;
  subtotalCents: number;
  ivaCents: number;
  totalCents: number;
  shippingMethodId: number | null;
  estimatedDays: string | null;
};

export type PriceBreakdown = {
  deliveryMode: DeliveryMode;
  detectedTier: ParcelSize;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  standard: PriceOption;
  express: PriceOption | null;
  insuranceCoverageCents: number;
};
