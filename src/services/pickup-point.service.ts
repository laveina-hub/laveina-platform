import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { PickupPoint } from "@/types/pickup-point";
import {
  createPickupPointSchema,
  updatePickupPointSchema,
  type CreatePickupPointInput,
  type UpdatePickupPointInput,
} from "@/validations/pickup-point.schema";

export type ListPickupPointsFilters = {
  postcode?: string;
  is_active?: boolean;
  search?: string;
};

export async function listPickupPoints(
  filters: ListPickupPointsFilters = {}
): Promise<ApiResponse<PickupPoint[]>> {
  const { postcode, is_active, search } = filters;

  const supabase = await createClient();

  let query = supabase.from("pickup_points").select("*").order("name");

  // Default to active only; pass is_active explicitly to override (admin views)
  if (is_active !== undefined) {
    query = query.eq("is_active", is_active);
  } else if (!("is_active" in filters)) {
    query = query.eq("is_active", true);
  }

  if (postcode) query = query.eq("postcode", postcode);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: data ?? [], error: null };
}

export async function getPickupPointById(pickupPointId: string): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pickup_points")
    .select("*")
    .eq("id", pickupPointId)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: "Pickup point not found", code: "NOT_FOUND", status: 404 },
    };
  }

  return { data, error: null };
}

export async function createPickupPoint(
  input: CreatePickupPointInput
): Promise<ApiResponse<PickupPoint>> {
  const parsed = createPickupPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pickup_points")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

export async function updatePickupPoint(
  pickupPointId: string,
  input: UpdatePickupPointInput
): Promise<ApiResponse<PickupPoint>> {
  const parsed = updatePickupPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pickup_points")
    .update(parsed.data)
    .eq("id", pickupPointId)
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

export async function toggleAvailability(pickupPointId: string): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("pickup_points")
    .select("is_active")
    .eq("id", pickupPointId)
    .single();

  if (fetchError || !current) {
    return {
      data: null,
      error: { message: "Pickup point not found", code: "NOT_FOUND", status: 404 },
    };
  }

  const { data, error } = await supabase
    .from("pickup_points")
    .update({ is_active: !current.is_active })
    .eq("id", pickupPointId)
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}
