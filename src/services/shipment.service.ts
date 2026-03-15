import { createClient } from "@/lib/supabase/server";
import { calculatePrice } from "@/services/pricing.service";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";
import type {
  Shipment,
  ShipmentInsert,
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
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function getShipmentById(
  shipmentId: string
): Promise<ApiResponse<ShipmentWithRelations>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function getShipmentByTrackingId(
  trackingId: string
): Promise<ApiResponse<ShipmentWithRelations>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
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

  throw new Error("Not implemented");
}

export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus
): Promise<ApiResponse<Shipment>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}
