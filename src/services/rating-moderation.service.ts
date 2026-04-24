import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import { adminRatingStatusSchema, type RatingStatus } from "@/validations/rating.schema";

// A11 moderation business logic. RLS policy `ratings_admin_all` grants admin
// full CRUD; the route layer still runs a role check to return a clean 403
// instead of an empty result.

type ProfileJoin = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type ShipmentJoin = {
  id: string;
  tracking_id: string | null;
};

type PickupPointJoin = {
  id: string;
  name: string | null;
};

export type AdminRatingRow = {
  id: string;
  customer_id: string;
  shipment_id: string;
  pickup_point_id: string | null;
  stars: number;
  comment: string | null;
  breakdown: Record<string, number> | null;
  status: RatingStatus;
  created_at: string;
  updated_at: string;
  customer: ProfileJoin | ProfileJoin[] | null;
  shipment: ShipmentJoin | ShipmentJoin[] | null;
  pickup_point: PickupPointJoin | PickupPointJoin[] | null;
};

const RATING_SELECT =
  "id, customer_id, shipment_id, pickup_point_id, stars, comment, breakdown, status, created_at, updated_at, customer:profiles(id, email, full_name), shipment:shipments(id, tracking_id), pickup_point:pickup_points(id, name)";

export async function listRatingsForModeration(
  status: RatingStatus | null
): Promise<ApiResponse<AdminRatingRow[]>> {
  const supabase = await createClient();

  let query = supabase
    .from("ratings")
    .select(RATING_SELECT)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return {
      data: null,
      error: { message: error.message, code: "DB_ERROR", status: 500 },
    };
  }

  // SAFETY: select string is fixed and matches AdminRatingRow field-for-field.
  return { data: (data ?? []) as AdminRatingRow[], error: null };
}

export async function moderateRating(
  id: string,
  input: unknown
): Promise<ApiResponse<AdminRatingRow>> {
  const parsed = adminRatingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? "invalid_body",
        code: "VALIDATION_ERROR",
        status: 400,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ratings")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select(RATING_SELECT)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: {
        message: error?.message ?? "Failed to update rating",
        code: "DB_ERROR",
        status: 500,
      },
    };
  }

  // SAFETY: select string is fixed and matches AdminRatingRow field-for-field.
  return { data: data as AdminRatingRow, error: null };
}
