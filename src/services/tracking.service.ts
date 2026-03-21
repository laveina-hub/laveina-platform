import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendStatusUpdate } from "@/services/notification.service";
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

// Rules: origin scan → received_at_origin, destination scan → ready_for_pickup (via arrived_at_destination)
function determineScanAction(shipment: Shipment, pickupPointId: string): ScanDecision {
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
    .select("*")
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

  const oldStatus = shipment.status as ShipmentStatus;
  const nextStatus = decision.type === "transition" ? decision.newStatus : null;
  const newStatus = nextStatus ?? oldStatus;

  let updatedShipment = shipment;
  let finalStatus = nextStatus;
  if (nextStatus) {
    const { data: updated, error: updateError } = await adminSupabase
      .from("shipments")
      .update({ status: nextStatus })
      .eq("id", shipment.id)
      .select()
      .single();

    if (updateError) {
      return {
        data: null,
        error: { message: `Status update failed: ${updateError.message}`, status: 500 },
      };
    }

    updatedShipment = updated;

    // Auto-transition: arrived_at_destination → ready_for_pickup
    if (nextStatus === ShipmentStatus.ARRIVED_AT_DESTINATION) {
      const { data: autoUpdated, error: autoError } = await adminSupabase
        .from("shipments")
        .update({ status: ShipmentStatus.READY_FOR_PICKUP })
        .eq("id", shipment.id)
        .select()
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
  }

  const { data: scanLog, error: scanError } = await adminSupabase
    .from("scan_logs")
    .insert({
      shipment_id: shipment.id,
      scanned_by: scannedBy,
      pickup_point_id: parsed.data.pickup_point_id,
      old_status: oldStatus,
      new_status: finalStatus ?? oldStatus,
    })
    .select()
    .single();

  if (scanError || !scanLog) {
    return { data: null, error: { message: "Failed to log scan", status: 500 } };
  }

  let otpSent = false;
  if (finalStatus === ShipmentStatus.READY_FOR_PICKUP) {
    const otpResult = await generateOtp({ shipment_id: shipment.id });
    otpSent = otpResult.error === null;
  }

  if (nextStatus) {
    void sendStatusUpdate({
      shipmentId: shipment.id,
      phone: shipment.receiver_phone,
      recipientName: shipment.receiver_name,
      trackingId: shipment.tracking_id,
      oldStatus,
      newStatus,
    }).catch(() => {});
  }

  return { data: { shipment: updatedShipment, scanLog, otpSent }, error: null };
}

/** Confirms delivery after OTP verification (ready_for_pickup → delivered). */
export async function confirmDelivery(
  confirmedBy: string,
  shipmentId: string,
  pickupPointId: string
): Promise<ApiResponse<{ shipment: Shipment; scanLog: ScanLog }>> {
  const adminSupabase = createAdminClient();

  const { data: shipment, error: findError } = await adminSupabase
    .from("shipments")
    .select("*")
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
    .select()
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
    .select()
    .single();

  if (scanError || !scanLog) {
    return { data: null, error: { message: "Failed to log delivery", status: 500 } };
  }

  void sendStatusUpdate({
    phone: shipment.receiver_phone,
    recipientName: shipment.receiver_name,
    trackingId: shipment.tracking_id,
    oldStatus: ShipmentStatus.READY_FOR_PICKUP,
    newStatus: ShipmentStatus.DELIVERED,
  }).catch(() => {});

  return { data: { shipment: updated, scanLog }, error: null };
}

export async function getTrackingHistory(shipmentId: string): Promise<ApiResponse<ScanLog[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scan_logs")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("scanned_at", { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: data ?? [], error: null };
}
