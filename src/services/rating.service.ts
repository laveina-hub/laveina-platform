import { aggregateRatingRows, type PublicRatingSummary } from "@/lib/ratings/aggregate";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";

// Q13.5 — public-facing aggregate ratings per pickup point. Approved status
// only (A11 default). Returns a map keyed by pickup_point_id so the caller
// can hydrate a list view in O(1) per row. The aggregation math lives in
// `@/lib/ratings/aggregate` so it can be unit-tested without env validation.

export type { PublicRatingSummary, RatingRow } from "@/lib/ratings/aggregate";

export async function getPublicRatingSummaries(
  pickupPointIds: string[]
): Promise<ApiResponse<Map<string, PublicRatingSummary>>> {
  if (pickupPointIds.length === 0) {
    return { data: new Map(), error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("pickup_point_id, stars")
    .eq("status", "approved")
    .in("pickup_point_id", pickupPointIds);

  if (error) {
    return {
      data: null,
      error: { message: error.message, code: "DB_ERROR", status: 500 },
    };
  }

  return { data: aggregateRatingRows(data ?? []), error: null };
}
