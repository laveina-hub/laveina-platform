import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  sendDeliveryToReceiver,
  sendDeliveryToSender,
  sendReadyForPickup,
  sendReceivedAtOrigin,
} from "@/services/notification.service";
import { generateOtp } from "@/services/otp.service";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import { ShipmentStatus } from "@/types/enums";
import type { Shipment } from "@/types/shipment";
import { scanQrSchema, type ScanQrInput } from "@/validations/scan.schema";

type ScanLog = Database["public"]["Tables"]["scan_logs"]["Row"];

type ScanResult = {
  shipment: Shipment;
  scanLog: ScanLog;
  otpSent: boolean;
};

type ScanDecision =
  | { type: "transition"; newStatus: ShipmentStatus }
  | { type: "error"; message: string; code: string }
  | { type: "no_change" };

function determineScanAction(shipment: Shipment, pickupPointId: string): ScanDecision {
  // SAFETY: DB column is constrained to ShipmentStatus enum values via CHECK constraint
  const currentStatus = shipment.status as ShipmentStatus;
  const isOrigin = pickupPointId === shipment.origin_pickup_point_id;
  const isDestination = pickupPointId === shipment.destination_pickup_point_id;

  if (!isOrigin && !isDestination) {
    return {
      type: "error",
      message: "This parcel is not assigned to your shop",
      code: "WRONG_SHOP",
    };
  }

  if (isOrigin) {
    if (currentStatus === ShipmentStatus.PAYMENT_CONFIRMED) {
      return { type: "transition", newStatus: ShipmentStatus.WAITING_AT_ORIGIN };
    }
    if (currentStatus === ShipmentStatus.WAITING_AT_ORIGIN) {
      return { type: "transition", newStatus: ShipmentStatus.RECEIVED_AT_ORIGIN };
    }
    if (currentStatus === ShipmentStatus.RECEIVED_AT_ORIGIN) {
      return {
        type: "error",
        message: "This parcel has already been received",
        code: "ALREADY_RECEIVED",
      };
    }
    return {
      type: "error",
      message: "Invalid scan at this shop for the current status",
      code: "INVALID_SCAN",
    };
  }

  if (isDestination) {
    if (currentStatus === ShipmentStatus.IN_TRANSIT) {
      return { type: "transition", newStatus: ShipmentStatus.ARRIVED_AT_DESTINATION };
    }
    if (currentStatus === ShipmentStatus.ARRIVED_AT_DESTINATION) {
      return { type: "transition", newStatus: ShipmentStatus.READY_FOR_PICKUP };
    }
    if (currentStatus === ShipmentStatus.READY_FOR_PICKUP) {
      return { type: "no_change" };
    }
    return {
      type: "error",
      message: "Invalid scan at this shop for the current status",
      code: "INVALID_SCAN",
    };
  }

  return { type: "no_change" };
}

export async function processQrScan(
  scannedBy: string,
  input: ScanQrInput
): Promise<ApiResponse<ScanResult>> {
  const parsed = scanQrSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select(
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_name, sender_phone, receiver_name, receiver_phone, parcel_size, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
    )
    .eq("tracking_id", parsed.data.tracking_id)
    .single();

  if (shipmentError || !shipment) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  if (shipment.status === ShipmentStatus.DELIVERED) {
    return {
      data: null,
      error: { message: "Shipment already delivered", code: "ALREADY_DELIVERED", status: 400 },
    };
  }

  const decision = determineScanAction(shipment, parsed.data.pickup_point_id);

  if (decision.type === "error") {
    return {
      data: null,
      error: { message: decision.message, code: decision.code, status: 400 },
    };
  }

  // SAFETY: DB column is constrained to ShipmentStatus enum values via CHECK constraint
  const oldStatus = shipment.status as ShipmentStatus;
  const nextStatus = decision.type === "transition" ? decision.newStatus : null;

  let updatedShipment = shipment;
  let finalStatus = nextStatus;
  if (nextStatus) {
    const { data: updated, error: updateError } = await adminSupabase
      .from("shipments")
      .update({ status: nextStatus })
      .eq("id", shipment.id)
      .select(
        "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_name, sender_phone, receiver_name, receiver_phone, parcel_size, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
      )
      .single();

    if (updateError) {
      return {
        data: null,
        error: { message: `Status update failed: ${updateError.message}`, status: 500 },
      };
    }

    updatedShipment = updated;
  }

  const { data: scanLog, error: scanError } = await adminSupabase
    .from("scan_logs")
    .insert({
      shipment_id: shipment.id,
      scanned_by: scannedBy,
      pickup_point_id: parsed.data.pickup_point_id,
      old_status: oldStatus,
      new_status: nextStatus ?? oldStatus,
    })
    .select("id, shipment_id, scanned_by, pickup_point_id, old_status, new_status, scanned_at")
    .single();

  // Auto-transition to ready_for_pickup on destination scan
  if (nextStatus === ShipmentStatus.ARRIVED_AT_DESTINATION) {
    const { data: autoUpdated, error: autoError } = await adminSupabase
      .from("shipments")
      .update({ status: ShipmentStatus.READY_FOR_PICKUP })
      .eq("id", shipment.id)
      .select(
        "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_name, sender_phone, receiver_name, receiver_phone, parcel_size, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
      )
      .single();

    if (!autoError && autoUpdated) {
      updatedShipment = autoUpdated;
      finalStatus = ShipmentStatus.READY_FOR_PICKUP;

      await adminSupabase.from("scan_logs").insert({
        shipment_id: shipment.id,
        scanned_by: scannedBy,
        pickup_point_id: parsed.data.pickup_point_id,
        old_status: ShipmentStatus.ARRIVED_AT_DESTINATION,
        new_status: ShipmentStatus.READY_FOR_PICKUP,
      });
    }
  }

  if (scanError || !scanLog) {
    return { data: null, error: { message: "Failed to log scan", status: 500 } };
  }

  let otpSent = false;
  if (finalStatus === ShipmentStatus.READY_FOR_PICKUP) {
    const otpResult = await generateOtp({ shipment_id: shipment.id });
    otpSent = otpResult.error === null;
  }

  const isOriginScan = parsed.data.pickup_point_id === shipment.origin_pickup_point_id;

  if (nextStatus && isOriginScan && nextStatus === ShipmentStatus.RECEIVED_AT_ORIGIN) {
    const { data: originShop } = await adminSupabase
      .from("pickup_points")
      .select("name")
      .eq("id", parsed.data.pickup_point_id)
      .single();

    void sendReceivedAtOrigin({
      shipmentId: shipment.id,
      senderPhone: shipment.sender_phone,
      senderName: shipment.sender_name,
      trackingId: shipment.tracking_id,
      shopName: originShop?.name ?? "",
    }).catch(() => {});
  }

  if (
    finalStatus === ShipmentStatus.READY_FOR_PICKUP &&
    nextStatus === ShipmentStatus.ARRIVED_AT_DESTINATION
  ) {
    const { data: destShop } = await adminSupabase
      .from("pickup_points")
      .select("name, address, city")
      .eq("id", parsed.data.pickup_point_id)
      .single();

    const shopAddress = destShop
      ? [destShop.address, destShop.city].filter(Boolean).join(", ")
      : "";

    void sendReadyForPickup({
      shipmentId: shipment.id,
      receiverPhone: shipment.receiver_phone,
      receiverName: shipment.receiver_name,
      trackingId: shipment.tracking_id,
      shopName: destShop?.name ?? "",
      shopAddress,
    }).catch(() => {});
  }

  return { data: { shipment: updatedShipment, scanLog, otpSent }, error: null };
}

export async function confirmDelivery(
  confirmedBy: string,
  shipmentId: string,
  pickupPointId: string
): Promise<ApiResponse<{ shipment: Shipment; scanLog: ScanLog }>> {
  const adminSupabase = createAdminClient();

  const { data: shipment, error: findError } = await adminSupabase
    .from("shipments")
    .select(
      "id, status, destination_pickup_point_id, sender_phone, sender_name, receiver_phone, receiver_name, tracking_id"
    )
    .eq("id", shipmentId)
    .single();

  if (findError || !shipment) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  if (shipment.destination_pickup_point_id !== pickupPointId) {
    return {
      data: null,
      error: {
        message: "This shipment is not assigned to this pickup point",
        code: "WRONG_SHOP",
        status: 403,
      },
    };
  }

  if (shipment.status !== ShipmentStatus.READY_FOR_PICKUP) {
    return {
      data: null,
      error: {
        message: "Shipment is not ready for pickup",
        code: "INVALID_STATUS",
        status: 400,
      },
    };
  }

  const { data: updated, error: updateError } = await adminSupabase
    .from("shipments")
    .update({ status: ShipmentStatus.DELIVERED })
    .eq("id", shipment.id)
    .select(
      "id, tracking_id, customer_id, status, origin_pickup_point_id, destination_pickup_point_id, origin_postcode, destination_postcode, sender_name, sender_phone, receiver_name, receiver_phone, parcel_size, weight_kg, billable_weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, delivery_mode, delivery_speed, price_cents, carrier_rate_cents, margin_percent, carrier_name, carrier_tracking_number, shipping_method_id, insurance_option_id, insurance_amount_cents, insurance_surcharge_cents, qr_code_url, label_url, sendcloud_parcel_id, stripe_checkout_session_id, stripe_payment_intent_id, created_at, updated_at"
    )
    .single();

  if (updateError || !updated) {
    return {
      data: null,
      error: { message: "Failed to update shipment status", status: 500 },
    };
  }

  const { data: scanLog, error: scanError } = await adminSupabase
    .from("scan_logs")
    .insert({
      shipment_id: shipment.id,
      scanned_by: confirmedBy,
      pickup_point_id: pickupPointId,
      old_status: ShipmentStatus.READY_FOR_PICKUP,
      new_status: ShipmentStatus.DELIVERED,
    })
    .select("id, shipment_id, scanned_by, pickup_point_id, old_status, new_status, scanned_at")
    .single();

  if (scanError || !scanLog) {
    return { data: null, error: { message: "Failed to log delivery", status: 500 } };
  }

  void sendDeliveryToSender({
    shipmentId: shipment.id,
    senderPhone: shipment.sender_phone,
    senderName: shipment.sender_name,
    trackingId: shipment.tracking_id,
  }).catch(() => {});

  void sendDeliveryToReceiver({
    shipmentId: shipment.id,
    receiverPhone: shipment.receiver_phone,
    receiverName: shipment.receiver_name,
    trackingId: shipment.tracking_id,
  }).catch(() => {});

  return { data: { shipment: updated, scanLog }, error: null };
}

export async function getTrackingHistory(shipmentId: string): Promise<ApiResponse<ScanLog[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scan_logs")
    .select("id, shipment_id, scanned_by, pickup_point_id, old_status, new_status, scanned_at")
    .eq("shipment_id", shipmentId)
    .order("scanned_at", { ascending: true })
    .limit(500);

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: data ?? [], error: null };
}
