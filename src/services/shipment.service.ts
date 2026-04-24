import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";
import type {
  Shipment,
  ShipmentWithRelations,
  CreateShipmentInput,
  PublicTrackingData,
} from "@/types/shipment";

export type ListShipmentsFilters = {
  status?: ShipmentStatus;
  /** When true, excludes `delivered`. Used by the customer dashboard
   *  "Active" tab. Ignored if `status` is also set. */
  active?: boolean;
  customer_id?: string;
  origin_pickup_point_id?: string;
  destination_pickup_point_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function createShipment(
  customerId: string,
  input: CreateShipmentInput
): Promise<ApiResponse<Shipment>> {
  const supabase = createAdminClient(); // admin: called from Stripe webhook

  const { data, error } = await supabase
    .from("shipments")
    .insert({
      customer_id: customerId,
      ...input,
    })
    .select(
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_first_name, sender_last_name, sender_phone, sender_whatsapp, sender_email, receiver_first_name, receiver_last_name, receiver_phone, receiver_whatsapp, receiver_email, parcel_size, parcel_preset_slug, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, preferred_locale, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, shipping_option_code, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, sendcloud_shipment_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

export async function setShipmentQrCodeUrl(
  shipmentId: string,
  qrCodeUrl: string
): Promise<ApiResponse<Shipment>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shipments")
    .update({ qr_code_url: qrCodeUrl })
    .eq("id", shipmentId)
    .select(
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_first_name, sender_last_name, sender_phone, sender_whatsapp, sender_email, receiver_first_name, receiver_last_name, receiver_phone, receiver_whatsapp, receiver_email, parcel_size, parcel_preset_slug, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, preferred_locale, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, shipping_option_code, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, sendcloud_shipment_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

export async function getShipmentById(
  shipmentId: string
): Promise<ApiResponse<ShipmentWithRelations>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipments")
    .select(
      // SAFETY: All shipment columns plus full relation rows are required to satisfy ShipmentWithRelations (which extends the full Shipment Row type with full pickup_points/profiles/scan_logs Row types)
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_first_name, sender_last_name, sender_phone, sender_whatsapp, sender_email, receiver_first_name, receiver_last_name, receiver_phone, receiver_whatsapp, receiver_email, parcel_size, parcel_preset_slug, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, preferred_locale, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, shipping_option_code, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, sendcloud_shipment_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(id, name, address, city, postcode, phone, email, image_url, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(id, name, address, city, postcode, phone, email, image_url, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at), customer:profiles(id, email, full_name, phone, role, created_at, updated_at), scan_logs(id, shipment_id, scanned_by, pickup_point_id, old_status, new_status, scanned_at)"
    )
    .eq("id", shipmentId)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  // SAFETY: Supabase query shape matches ShipmentWithRelations via the explicit .select() column list including joined relations
  return { data: data as unknown as ShipmentWithRelations, error: null };
}

export async function getShipmentByTrackingId(
  trackingId: string
): Promise<ApiResponse<ShipmentWithRelations>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipments")
    .select(
      // SAFETY: All shipment columns plus full relation rows are required to satisfy ShipmentWithRelations (which extends the full Shipment Row type with full pickup_points/profiles/scan_logs Row types)
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_first_name, sender_last_name, sender_phone, sender_whatsapp, sender_email, receiver_first_name, receiver_last_name, receiver_phone, receiver_whatsapp, receiver_email, parcel_size, parcel_preset_slug, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, preferred_locale, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, shipping_option_code, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, sendcloud_shipment_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(id, name, address, city, postcode, phone, email, image_url, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(id, name, address, city, postcode, phone, email, image_url, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at), customer:profiles(id, email, full_name, phone, role, created_at, updated_at), scan_logs(id, shipment_id, scanned_by, pickup_point_id, old_status, new_status, scanned_at)"
    )
    .eq("tracking_id", trackingId)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  // SAFETY: Supabase query shape matches ShipmentWithRelations via the explicit .select() column list including joined relations
  return { data: data as unknown as ShipmentWithRelations, error: null };
}

export async function listShipments(
  filters: ListShipmentsFilters = {}
): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
  const {
    status,
    active,
    customer_id,
    origin_pickup_point_id,
    destination_pickup_point_id,
    search,
    page = 1,
    pageSize = 20,
  } = filters;

  const supabase = await createClient();

  let query = supabase
    .from("shipments")
    .select(
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_first_name, sender_last_name, sender_phone, sender_whatsapp, sender_email, receiver_first_name, receiver_last_name, receiver_phone, receiver_whatsapp, receiver_email, parcel_size, parcel_preset_slug, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, preferred_locale, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, shipping_option_code, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, sendcloud_shipment_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) {
    query = query.eq("status", status);
  } else if (active) {
    // Q14.3 — A11 (client answer 2026-04-21): Active tab = everything not yet
    // delivered, PLUS deliveries from the last 7 days. The 7-day tail keeps a
    // freshly-delivered parcel visible in Active so the customer can drop a
    // rating from the same place they tracked it. After 7 days it falls off
    // to the Delivered tab. PostgREST `.or()` with `and(...)` lets us
    // express the union without a custom RPC.
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.or(
      `status.neq.delivered,and(status.eq.delivered,created_at.gt.${sevenDaysAgoIso})`
    );
  }
  if (customer_id) query = query.eq("customer_id", customer_id);
  if (origin_pickup_point_id) query = query.eq("origin_pickup_point_id", origin_pickup_point_id);
  if (destination_pickup_point_id)
    query = query.eq("destination_pickup_point_id", destination_pickup_point_id);
  if (search) query = query.ilike("tracking_id", `%${search}%`);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  const total = count ?? 0;

  return {
    data: {
      data: data ?? [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    error: null,
  };
}

export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus
): Promise<ApiResponse<Shipment>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipments")
    .update({ status: newStatus })
    .eq("id", shipmentId)
    .select(
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_first_name, sender_last_name, sender_phone, sender_whatsapp, sender_email, receiver_first_name, receiver_last_name, receiver_phone, receiver_whatsapp, receiver_email, parcel_size, parcel_preset_slug, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, preferred_locale, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, shipping_option_code, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, sendcloud_shipment_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

/** Bypasses RLS — returns only non-sensitive fields for public tracking. */
export async function getPublicTrackingData(
  trackingId: string
): Promise<ApiResponse<PublicTrackingData>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shipments")
    .select(
      "tracking_id, status, created_at, parcel_size, delivery_mode, delivery_speed, carrier_name, carrier_tracking_number, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(name, address, city, latitude, longitude), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city, latitude, longitude), scan_logs(new_status, scanned_at)"
    )
    .eq("tracking_id", trackingId)
    .order("scanned_at", { referencedTable: "scan_logs", ascending: true })
    .single();

  if (error || !data) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  // SAFETY: Supabase query shape matches PublicTrackingData via the explicit .select() column list
  return { data: data as unknown as PublicTrackingData, error: null };
}
