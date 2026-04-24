// Q13.5 — pure aggregation helper for the public ratings endpoint. Lives
// outside the service module so its unit tests can import it without
// transitively pulling in `@/lib/supabase/server` (and therefore the env
// validation, which fails in the Vitest sandbox).
//
// `getPublicRatingSummaries` in `services/rating.service.ts` is the only
// runtime caller — it fetches the rows from Supabase and hands them off
// here for shaping.

export type PublicRatingSummary = {
  averageStars: number;
  count: number;
};

export type RatingRow = {
  pickup_point_id: string | null;
  stars: number;
};

/**
 * Reduces a flat list of approved rating rows into a
 * `pickup_point_id → { averageStars, count }` map.
 *
 * Average is rounded to one decimal place to match the UI's `.toFixed(1)`.
 * Rows with a null pickup_point_id are skipped.
 */
export function aggregateRatingRows(rows: readonly RatingRow[]): Map<string, PublicRatingSummary> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    if (!row.pickup_point_id) continue;
    const existing = totals.get(row.pickup_point_id) ?? { sum: 0, count: 0 };
    existing.sum += row.stars;
    existing.count += 1;
    totals.set(row.pickup_point_id, existing);
  }

  const summaries = new Map<string, PublicRatingSummary>();
  for (const [id, { sum, count }] of totals) {
    summaries.set(id, {
      averageStars: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      count,
    });
  }
  return summaries;
}
