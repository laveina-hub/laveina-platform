"use client";

import { useQuery } from "@tanstack/react-query";

// Q13.5 — fetches the public rating summary for a batch of pickup-point ids.
// Returns a Record<id, { average, count }> so the consumer can do O(1) lookup
// inside a list render.

export type PickupPointRatingSummary = {
  average: number;
  count: number;
};

async function fetchSummaries(ids: string[]): Promise<Record<string, PickupPointRatingSummary>> {
  if (ids.length === 0) return {};
  const res = await fetch(`/api/pickup-points/ratings?ids=${encodeURIComponent(ids.join(","))}`);
  if (!res.ok) throw new Error("failed_to_fetch_ratings");
  const json = (await res.json()) as { data: Record<string, PickupPointRatingSummary> };
  return json.data ?? {};
}

export function usePickupPointRatings(ids: string[]) {
  // Sort + join so the cache key stays stable when the parent re-renders the
  // same list in a different order.
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["pickup-point-ratings", key],
    queryFn: () => fetchSummaries(ids),
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });
}
