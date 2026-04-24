// Q6.10 — pickup-point smart ranking for the Step 2 lists + mobile picker.
// Assigns at most one badge per point:
//   - "best"     : closest point that is currently open now
//   - "closest"  : overall closest point (when not already tagged "best")
//   - "openNow"  : first open point (when no distance data to rank)
// Points flagged as temporarily closed (`getActiveOverride`) are never ranked.

import { haversineKm } from "@/lib/geo";
import type { PickupPoint, PickupPointWithOverrides } from "@/types/pickup-point";

import { getActiveOverride, isOpenNow } from "./working-hours";

export type PickupPointRankBadge = "best" | "closest" | "openNow";

type RankableInput = PickupPoint | PickupPointWithOverrides;

export function rankPickupPoints(
  points: readonly RankableInput[],
  /** Reference point used to compute distances; null skips distance ranking. */
  reference: { latitude: number; longitude: number } | null,
  now: Date = new Date()
): Map<string, PickupPointRankBadge> {
  const result = new Map<string, PickupPointRankBadge>();
  if (points.length === 0) return result;

  // Exclude temporarily-closed overrides; they get no ranking badge.
  const eligible = points.filter((p) => {
    const overrides = "pickup_point_overrides" in p ? p.pickup_point_overrides : null;
    return getActiveOverride(overrides ?? null, now) === null;
  });
  if (eligible.length === 0) return result;

  const byDistance = reference
    ? [...eligible]
        .map((p) => ({
          id: p.id,
          km: haversineKm(reference, p),
          openNow: isOpenNow(p.working_hours, now),
        }))
        .sort((a, b) => a.km - b.km)
    : null;

  if (byDistance && byDistance.length > 0) {
    const closestOpen = byDistance.find((p) => p.openNow);
    const overallClosest = byDistance[0];

    if (closestOpen) {
      result.set(closestOpen.id, "best");
    }
    if (overallClosest && !result.has(overallClosest.id)) {
      result.set(overallClosest.id, "closest");
    }
    return result;
  }

  // No distance reference — fall back to tagging the first open point.
  const firstOpen = eligible.find((p) => isOpenNow(p.working_hours, now));
  if (firstOpen) result.set(firstOpen.id, "openNow");
  return result;
}
