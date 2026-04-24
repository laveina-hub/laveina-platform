import type { ParcelPresetSlug } from "@/constants/parcel-sizes";

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

export type PublicTrackingPoint = {
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
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
  origin_pickup_point: PublicTrackingPoint | null;
  destination_pickup_point: PublicTrackingPoint | null;
  scan_logs: { new_status: string; scanned_at: string }[];
};

// M2 shape: split names, whatsapp + email per A1/A2/A3, preset_slug alongside
// legacy `parcel_size` enum (still NOT NULL in DB — derive via presetToLegacyTier).
// `insurance_amount_cents` holds the declared value (A3), `insurance_surcharge_cents`
// the cost charged. `insurance_option_id` is null for M2 (legacy table unused).
export type CreateShipmentInput = {
  sender_first_name: string;
  sender_last_name: string;
  sender_phone: string;
  sender_whatsapp: string | null;
  sender_email: string;

  receiver_first_name: string;
  receiver_last_name: string;
  receiver_phone: string;
  receiver_whatsapp: string | null;
  receiver_email: string;

  origin_pickup_point_id: string;
  destination_pickup_point_id: string;
  origin_postcode: string;
  destination_postcode: string;

  parcel_size: ParcelSize;
  parcel_preset_slug: ParcelPresetSlug | null;
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
  /** v3 carrier selector replayed at dispatch time. Null on BCN. */
  shipping_option_code: string | null;

  insurance_option_id: string | null;
  insurance_amount_cents: number;
  insurance_surcharge_cents: number;

  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;

  /** Locale captured at checkout; powers post-webhook email localisation. */
  preferred_locale: string;
};

/** Maps an M2 preset to the legacy parcel_size enum so the NOT NULL DB column
 *  stays populated. The enum is kept for Phase 1 compatibility; M2 code
 *  should read `parcel_preset_slug` instead. */
export function presetToLegacyTier(slug: ParcelPresetSlug): ParcelSize {
  switch (slug) {
    case "mini":
      return "tier_1" as ParcelSize;
    case "small":
      return "tier_2" as ParcelSize;
    case "medium":
      return "tier_3" as ParcelSize;
    case "large":
      return "tier_5" as ParcelSize;
  }
}

/**
 * Per-parcel price breakdown shaped per client Q15.2:
 *   Subtotal = Delivery + Insurance    (both ex-VAT)
 *   VAT      = 21% × Subtotal
 *   Total    = Subtotal + VAT          (what the customer pays)
 */
export type PriceOption = {
  /** Ex-VAT delivery charge (Barcelona matrix value, or SendCloud carrier
   *  rate × margin × floor). */
  shippingCents: number;
  carrierRateCents: number;
  marginPercent: number;
  /** Ex-VAT insurance tier cost. Included in the VAT base per Q15.2. */
  insuranceSurchargeCents: number;
  /** Delivery + Insurance, both ex-VAT. */
  subtotalCents: number;
  /** 21% of subtotal. */
  ivaCents: number;
  /** Subtotal + VAT — amount charged to the customer for this parcel. */
  totalCents: number;
  /** Legacy numeric id kept for the `shipping_method_id` column. Null on BCN. */
  shippingMethodId: number | null;
  /** v3 carrier selector — null on BCN. Persisted and replayed at dispatch. */
  shippingOptionCode: string | null;
  estimatedDays: string | null;
};
