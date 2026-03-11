import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Shipment } from "@/types/shipment";
import type { ShipmentStatus } from "@/types/enums";
import type { Database } from "@/types/database.types";
import { scanQrSchema, type ScanQrInput } from "@/validations/scan.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScanLog = Database["public"]["Tables"]["scan_logs"]["Row"];

/**
 * Allowed status transitions. Each key maps to the set of statuses it can
 * transition to.
 */
const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  payment_confirmed: ["waiting_at_origin"],
  waiting_at_origin: ["received_at_origin"],
  received_at_origin: ["in_transit"],
  in_transit: ["arrived_at_destination"],
  arrived_at_destination: ["ready_for_pickup"],
  ready_for_pickup: ["delivered"],
  delivered: [],
};

// ---------------------------------------------------------------------------
// processQrScan
// ---------------------------------------------------------------------------

/**
 * Processes a QR scan event from a pickup point operator.
 *
 * Steps:
 *  1. Validate the input (tracking_id + pickup_point_id)
 *  2. Fetch the shipment by tracking_id
 *  3. Determine the next valid status based on VALID_TRANSITIONS
 *  4. Insert a scan_log entry
 *  5. Update the shipment status
 *  6. Return the updated shipment and scan log
 */
export async function processQrScan(
  scannedBy: string,
  input: ScanQrInput,
): Promise<ApiResponse<{ shipment: Shipment; scanLog: ScanLog }>> {
  // TODO: Validate input with scanQrSchema.parse(input)
  // TODO: Fetch shipment by tracking_id, return 404 if not found
  // TODO: Determine next status from VALID_TRANSITIONS[currentStatus]
  // TODO: Return 400 ApiError if no valid transition exists
  // TODO: Insert scan_log row with old_status and new_status
  // TODO: Update shipment status
  // TODO: Return { shipment, scanLog }

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// getTrackingHistory
// ---------------------------------------------------------------------------

/**
 * Returns the full scan log history for a shipment, ordered chronologically.
 */
export async function getTrackingHistory(
  shipmentId: string,
): Promise<ApiResponse<ScanLog[]>> {
  // TODO: Query scan_logs where shipment_id = shipmentId
  // TODO: Order by scanned_at ascending
  // TODO: Return the rows

  const supabase = await createClient();

  throw new Error("Not implemented");
}
