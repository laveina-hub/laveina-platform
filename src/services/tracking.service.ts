import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import type { ShipmentStatus } from "@/types/enums";
import type { Shipment } from "@/types/shipment";
import { scanQrSchema, type ScanQrInput } from "@/validations/scan.schema";

type ScanLog = Database["public"]["Tables"]["scan_logs"]["Row"];

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  payment_confirmed: ["waiting_at_origin"],
  waiting_at_origin: ["received_at_origin"],
  received_at_origin: ["in_transit"],
  in_transit: ["arrived_at_destination"],
  arrived_at_destination: ["ready_for_pickup"],
  ready_for_pickup: ["delivered"],
  delivered: [],
};

export async function processQrScan(
  scannedBy: string,
  input: ScanQrInput
): Promise<ApiResponse<{ shipment: Shipment; scanLog: ScanLog }>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function getTrackingHistory(shipmentId: string): Promise<ApiResponse<ScanLog[]>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}
