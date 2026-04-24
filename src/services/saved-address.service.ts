import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import {
  createSavedAddressSchema,
  updateSavedAddressSchema,
  type CreateSavedAddressInput,
  type UpdateSavedAddressInput,
} from "@/validations/saved-address.schema";

// A5 (client answer 2026-04-21): customer-owned saved pickup points. RLS on
// `saved_addresses` restricts every read/write to `customer_id = auth.uid()`,
// so the service relies on the RLS-aware server client — no explicit user-id
// filter in each query. Default-uniqueness is enforced by a partial unique
// index on (customer_id) WHERE is_default = true (migration 00001); we clear
// any existing default before inserting/updating a new one.

export type SavedAddressRow = Database["public"]["Tables"]["saved_addresses"]["Row"];

/**
 * Shape returned by {@link listMySavedAddresses} — the base row plus a nested
 * pickup-point summary so the Step 2 dropdown can show name + postcode without
 * an extra fetch.
 */
export type SavedAddressWithPickupPoint = SavedAddressRow & {
  pickup_point: {
    id: string;
    name: string;
    postcode: string;
    city: string | null;
    address: string;
    latitude: number;
    longitude: number;
  } | null;
};

/** List the current customer's saved addresses, defaults first, newest first. */
export async function listMySavedAddresses(): Promise<ApiResponse<SavedAddressWithPickupPoint[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saved_addresses")
    .select(
      "id, customer_id, label, pickup_point_id, is_default, created_at, updated_at, pickup_point:pickup_points(id, name, postcode, city, address, latitude, longitude)"
    )
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  // SAFETY: explicit .select() column list matches SavedAddressWithPickupPoint shape
  return { data: (data ?? []) as unknown as SavedAddressWithPickupPoint[], error: null };
}

/** Create a new saved address; clears any existing default first if needed. */
export async function createSavedAddress(
  input: CreateSavedAddressInput
): Promise<ApiResponse<SavedAddressRow>> {
  const parsed = createSavedAddressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED", status: 401 } };
  }

  if (parsed.data.is_default) {
    await supabase.from("saved_addresses").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("saved_addresses")
    .insert({
      customer_id: user.id,
      label: parsed.data.label,
      pickup_point_id: parsed.data.pickup_point_id,
      is_default: parsed.data.is_default ?? false,
    })
    .select("id, customer_id, label, pickup_point_id, is_default, created_at, updated_at")
    .single();

  if (error || !data) {
    return { data: null, error: { message: error?.message ?? "Insert failed", status: 500 } };
  }

  return { data, error: null };
}

/** Update a saved address owned by the current customer. */
export async function updateSavedAddress(
  id: string,
  input: UpdateSavedAddressInput
): Promise<ApiResponse<SavedAddressRow>> {
  const parsed = updateSavedAddressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  if (parsed.data.is_default === true) {
    await supabase
      .from("saved_addresses")
      .update({ is_default: false })
      .eq("is_default", true)
      .neq("id", id);
  }

  const { data, error } = await supabase
    .from("saved_addresses")
    .update(parsed.data)
    .eq("id", id)
    .select("id, customer_id, label, pickup_point_id, is_default, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: {
        message: error?.message ?? "Saved address not found",
        code: "NOT_FOUND",
        status: 404,
      },
    };
  }

  return { data, error: null };
}

/** Delete a saved address owned by the current customer. */
export async function deleteSavedAddress(id: string): Promise<ApiResponse<{ id: string }>> {
  const supabase = await createClient();

  const { error } = await supabase.from("saved_addresses").delete().eq("id", id);

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: { id }, error: null };
}
