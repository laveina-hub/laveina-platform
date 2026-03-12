import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Shipment,
  ShipmentInsert,
  ShipmentWithRelations,
  CreateShipmentInput,
  PriceBreakdown,
} from "@/types/shipment";
import type { ShipmentStatus } from "@/types/enums";
import { createShipmentSchema } from "@/validations/shipment.schema";
import { calculatePrice } from "@/services/pricing.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ListShipmentsFilters = {
  status?: ShipmentStatus;
  customer_id?: string;
  origin_pickup_point_id?: string;
  destination_pickup_point_id?: string;
  search?: string; // search by tracking_id, sender/receiver name
  page?: number;
  pageSize?: number;
};

// ---------------------------------------------------------------------------
// createShipment
// ---------------------------------------------------------------------------

/**
 * Creates a new shipment record.
 * - Validates input via Zod schema
 * - Calculates price via pricing service
 * - Generates a unique tracking_id
 * - Inserts the shipment row
 * - Returns the created shipment with price breakdown
 */
export async function createShipment(
  customerId: string,
  input: CreateShipmentInput,
): Promise<ApiResponse<{ shipment: Shipment; price: PriceBreakdown }>> {
  // TODO: Validate input with createShipmentSchema.parse(input)
  // TODO: Call calculatePrice(input.origin_postcode, input.destination_postcode, input.weight_kg)
  // TODO: Generate tracking_id (e.g. "LAV-" + nanoid)
  // TODO: Insert shipment row via supabase
  // TODO: Return the created shipment + price breakdown

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// getShipmentById
// ---------------------------------------------------------------------------

/**
 * Fetches a single shipment by its primary key (UUID), including relations.
 */
export async function getShipmentById(
  shipmentId: string,
): Promise<ApiResponse<ShipmentWithRelations>> {
  // TODO: Query shipments table with select including:
  //   origin_pickup_point:pickup_points!origin_pickup_point_id(*)
  //   destination_pickup_point:pickup_points!destination_pickup_point_id(*)
  //   customer:profiles!customer_id(*)
  //   scan_logs(*)
  // TODO: Return 404 ApiError if not found

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// getShipmentByTrackingId
// ---------------------------------------------------------------------------

/**
 * Fetches a single shipment by its human-readable tracking_id.
 */
export async function getShipmentByTrackingId(
  trackingId: string,
): Promise<ApiResponse<ShipmentWithRelations>> {
  // TODO: Query shipments table where tracking_id = trackingId
  // TODO: Include the same relations as getShipmentById
  // TODO: Return 404 ApiError if not found

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// listShipments
// ---------------------------------------------------------------------------

/**
 * Lists shipments with pagination, filtering, and optional text search.
 */
export async function listShipments(
  filters: ListShipmentsFilters = {},
): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
  const { status, customer_id, origin_pickup_point_id, destination_pickup_point_id, search, page = 1, pageSize = 20 } = filters;

  // TODO: Build supabase query with dynamic filters
  // TODO: Apply .eq() for status, customer_id, pickup point IDs when provided
  // TODO: Apply .or() for search across tracking_id, sender_name, receiver_name
  // TODO: Apply .range() for pagination
  // TODO: Execute count query in parallel for total
  // TODO: Return PaginatedResponse shape

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// updateShipmentStatus
// ---------------------------------------------------------------------------

/**
 * Updates the status of a shipment.
 * Validates that the status transition is allowed before persisting.
 */
export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus,
): Promise<ApiResponse<Shipment>> {
  // TODO: Fetch current shipment to get old status
  // TODO: Validate status transition (e.g. payment_confirmed -> waiting_at_origin)
  // TODO: Update shipment status and updated_at
  // TODO: Return the updated shipment

  const supabase = await createClient();

  throw new Error("Not implemented");
}
