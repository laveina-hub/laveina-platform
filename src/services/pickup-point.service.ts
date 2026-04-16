import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { PickupPoint } from "@/types/pickup-point";
import {
  createPickupPointSchema,
  updatePickupPointSchema,
  type CreatePickupPointInput,
  type CsvPickupPointRow,
  type UpdatePickupPointInput,
} from "@/validations/pickup-point.schema";

import { createPickupPointOwner } from "./pickup-point-owner.service";

export type ListPickupPointsFilters = {
  postcode?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listPickupPoints(
  filters: ListPickupPointsFilters = {}
): Promise<ApiResponse<PickupPoint[]>> {
  const { postcode, is_active, search } = filters;

  const supabase = await createClient();

  let query = supabase
    .from("pickup_points")
    .select(
      "id, name, address, city, postcode, phone, email, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at"
    )
    .order("name")
    .limit(200);

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

export async function listPickupPointsPaginated(
  filters: ListPickupPointsFilters = {}
): Promise<ApiResponse<PaginatedResponse<PickupPoint>>> {
  const { postcode, is_active, search, page = 1, pageSize = 20 } = filters;

  const supabase = await createClient();

  let query = supabase
    .from("pickup_points")
    .select(
      "id, name, address, city, postcode, phone, email, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at",
      { count: "exact" }
    )
    .order("name");

  if (is_active !== undefined) {
    query = query.eq("is_active", is_active);
  } else if (!("is_active" in filters)) {
    query = query.eq("is_active", true);
  }

  if (postcode) query = query.eq("postcode", postcode);
  if (search) query = query.ilike("name", `%${search}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

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

export async function getPickupPointById(pickupPointId: string): Promise<ApiResponse<PickupPoint>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pickup_points")
    .select(
      "id, name, address, city, postcode, phone, email, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at"
    )
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

  let ownerId: string | null = null;
  const email = parsed.data.email?.trim();
  if (email) {
    const ownerResult = await createPickupPointOwner(email, {
      fullName: parsed.data.name,
      phone: parsed.data.phone,
    });
    if (ownerResult.error) {
      return {
        data: null,
        error: { message: `Owner creation failed: ${ownerResult.error}`, status: 400 },
      };
    }
    ownerId = ownerResult.userId;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pickup_points")
    .insert({ ...parsed.data, owner_id: ownerId })
    .select(
      "id, name, address, city, postcode, phone, email, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at"
    )
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
    .select(
      "id, name, address, city, postcode, phone, email, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}

export type BulkImportResult = {
  inserted: number;
  failed: Array<{ name: string; message: string }>;
};

export async function bulkImportPickupPoints(
  rows: CsvPickupPointRow[]
): Promise<ApiResponse<BulkImportResult>> {
  if (rows.length === 0) {
    return {
      data: null,
      error: { message: "No rows to import", code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();
  const inserted: number[] = [];
  const failed: Array<{ name: string; message: string }> = [];

  for (const row of rows) {
    const parsed = createPickupPointSchema.safeParse(row);
    if (!parsed.success) {
      failed.push({ name: row.name, message: parsed.error.issues[0].message });
      continue;
    }

    // Create owner account from email (dev: password, prod: invite email)
    let ownerId: string | null = null;
    const email = row.email?.trim();
    if (email) {
      const ownerResult = await createPickupPointOwner(email, {
        fullName: row.name,
        phone: row.phone,
      });
      if (ownerResult.error) {
        failed.push({ name: row.name, message: `Owner creation failed: ${ownerResult.error}` });
        continue;
      }
      ownerId = ownerResult.userId;
    }

    const { error } = await supabase
      .from("pickup_points")
      .insert({ ...parsed.data, owner_id: ownerId, is_active: false });

    if (error) {
      failed.push({ name: row.name, message: error.message });
    } else {
      inserted.push(1);
    }
  }

  return {
    data: { inserted: inserted.length, failed },
    error: null,
  };
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
    .select(
      "id, name, address, city, postcode, phone, email, latitude, longitude, is_active, is_open, working_hours, owner_id, created_at, updated_at"
    )
    .single();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data, error: null };
}
