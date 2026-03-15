import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import {
  createPickupPointSchema,
  updatePickupPointSchema,
  type CreatePickupPointInput,
  type UpdatePickupPointInput,
} from "@/validations/pickup-point.schema";

type PickupPoint = Database["public"]["Tables"]["pickup_points"]["Row"];

export type ListPickupPointsFilters = {
  postcode?: string;
  is_active?: boolean;
  search?: string;
};

export async function listPickupPoints(
  filters: ListPickupPointsFilters = {}
): Promise<ApiResponse<PickupPoint[]>> {
  const { postcode, is_active = true, search } = filters;

  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function getPickupPointById(pickupPointId: string): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function createPickupPoint(
  input: CreatePickupPointInput
): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function updatePickupPoint(
  pickupPointId: string,
  input: UpdatePickupPointInput
): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function toggleAvailability(pickupPointId: string): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}
