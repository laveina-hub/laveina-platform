import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import type { Shipment } from "@/types/shipment";
import { scanQrSchema, type ScanQrInput } from "@/validations/scan.schema";

type ScanLog = Database["public"]["Tables"]["scan_logs"]["Row"];

export async function processQrScan(
  scannedBy: string,
  input: ScanQrInput
): Promise<ApiResponse<{ shipment: Shipment; scanLog: ScanLog }>> {
  const parsed = scanQrSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  // Find shipment by tracking ID
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

  // TODO: Determine next status based on pickup point role and current status
  // For now, just log the scan with current status
  const { data: scanLog, error: scanError } = await supabase
    .from("scan_logs")
    .insert({
      shipment_id: shipment.id,
      scanned_by: scannedBy,
      pickup_point_id: parsed.data.pickup_point_id,
      old_status: shipment.status,
      new_status: shipment.status,
    })
    .select()
    .single();

  if (scanError || !scanLog) {
    return { data: null, error: { message: "Failed to log scan", status: 500 } };
  }

  return { data: { shipment, scanLog }, error: null };
}

export async function getTrackingHistory(shipmentId: string): Promise<ApiResponse<ScanLog[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scan_logs")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: data ?? [], error: null };
}
