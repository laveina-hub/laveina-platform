import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";
import type {
  Shipment,
  ShipmentWithRelations,
  CreateShipmentInput,
  PriceBreakdown,
} from "@/types/shipment";
import { createShipmentSchema } from "@/validations/shipment.schema";

export type ListShipmentsFilters = {
  status?: ShipmentStatus;
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
): Promise<ApiResponse<{ shipment: Shipment; price: PriceBreakdown }>> {
  const parsed = createShipmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  // TODO: Generate tracking ID, calculate price, insert shipment
  throw new Error("Not implemented");
}

export async function getShipmentById(
  shipmentId: string
): Promise<ApiResponse<ShipmentWithRelations>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipments")
    .select(
      "*, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(*), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(*), customer:profiles(*), scan_logs(*)"
    )
    .eq("id", shipmentId)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  return { data: data as unknown as ShipmentWithRelations, error: null };
}

export async function getShipmentByTrackingId(
  trackingId: string
): Promise<ApiResponse<ShipmentWithRelations>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipments")
    .select(
      "*, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(*), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(*), customer:profiles(*), scan_logs(*)"
    )
    .eq("tracking_id", trackingId)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: "Shipment not found", code: "NOT_FOUND", status: 404 },
    };
  }

  return { data: data as unknown as ShipmentWithRelations, error: null };
}

export async function listShipments(
  filters: ListShipmentsFilters = {}
): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
  const {
    status,
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
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);
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
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}
