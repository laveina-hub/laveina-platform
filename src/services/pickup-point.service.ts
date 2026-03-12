import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import {
  createPickupPointSchema,
  updatePickupPointSchema,
  type CreatePickupPointInput,
  type UpdatePickupPointInput,
} from "@/validations/pickup-point.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PickupPoint = Database["public"]["Tables"]["pickup_points"]["Row"];

export type ListPickupPointsFilters = {
  postcode?: string;
  is_active?: boolean;
  search?: string;
};

// ---------------------------------------------------------------------------
// listPickupPoints
// ---------------------------------------------------------------------------

/**
 * Lists pickup points with optional filters.
 * By default returns only active pickup points.
 */
export async function listPickupPoints(
  filters: ListPickupPointsFilters = {},
): Promise<ApiResponse<PickupPoint[]>> {
  const { postcode, is_active = true, search } = filters;

  // TODO: Build supabase query on pickup_points table
  // TODO: Apply .eq("is_active", is_active) when is_active is provided
  // TODO: Apply .eq("postcode", postcode) when postcode is provided
  // TODO: Apply .ilike("name", `%${search}%`) when search is provided
  // TODO: Order by name ascending
  // TODO: Return rows

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// getPickupPointById
// ---------------------------------------------------------------------------

/**
 * Fetches a single pickup point by its UUID.
 */
export async function getPickupPointById(
  pickupPointId: string,
): Promise<ApiResponse<PickupPoint>> {
  // TODO: Query pickup_points where id = pickupPointId
  // TODO: Return 404 ApiError if not found
  // TODO: Return the pickup point

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// createPickupPoint
// ---------------------------------------------------------------------------

/**
 * Creates a new pickup point after validating the input.
 */
export async function createPickupPoint(
  input: CreatePickupPointInput,
): Promise<ApiResponse<PickupPoint>> {
  // TODO: Validate input with createPickupPointSchema.parse(input)
  // TODO: Insert row into pickup_points
  // TODO: Return the created pickup point

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// updatePickupPoint
// ---------------------------------------------------------------------------

/**
 * Updates an existing pickup point by ID.
 */
export async function updatePickupPoint(
  pickupPointId: string,
  input: UpdatePickupPointInput,
): Promise<ApiResponse<PickupPoint>> {
  // TODO: Validate input with updatePickupPointSchema.parse(input)
  // TODO: Update pickup_points row where id = pickupPointId
  // TODO: Return 404 ApiError if not found
  // TODO: Return the updated pickup point

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// toggleAvailability
// ---------------------------------------------------------------------------

/**
 * Toggles the `is_open` flag on a pickup point (open/closed for the day).
 */
export async function toggleAvailability(
  pickupPointId: string,
): Promise<ApiResponse<PickupPoint>> {
  // TODO: Fetch current pickup point to get current is_open value
  // TODO: Return 404 ApiError if not found
  // TODO: Update is_open to !current value
  // TODO: Return the updated pickup point

  const supabase = await createClient();

  throw new Error("Not implemented");
}
