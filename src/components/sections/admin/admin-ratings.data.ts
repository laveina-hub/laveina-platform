import { formatDateTimeMedium, type Locale } from "@/lib/format";
import { type RatingStatus } from "@/validations/rating.schema";

// Shared types + fetch helpers for the admin ratings surface. The row shape
// mirrors `/api/admin/ratings` — keep in sync if the joined columns change.

export type ProfileStub = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export type ShipmentStub = {
  id: string;
  tracking_id: string | null;
};

export type PickupPointStub = {
  id: string;
  name: string | null;
};

export type AdminRating = {
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
  customer: ProfileStub | ProfileStub[] | null;
  shipment: ShipmentStub | ShipmentStub[] | null;
  pickup_point: PickupPointStub | PickupPointStub[] | null;
};

export function unwrapOne<T>(raw: T | T[] | null): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export function formatRatingDateTime(value: string, locale: Locale): string {
  return formatDateTimeMedium(value, locale);
}

export async function fetchRatings(status: RatingStatus | "all"): Promise<AdminRating[]> {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  const res = await fetch(`/api/admin/ratings?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "fetch failed" }));
    throw new Error(body.error ?? "fetch failed");
  }
  const json = await res.json();
  return (json.data ?? []) as AdminRating[];
}

export async function saveRating(id: string, status: RatingStatus): Promise<AdminRating> {
  const res = await fetch(`/api/admin/ratings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "save failed" }));
    throw new Error(body.error ?? "save failed");
  }
  const json = await res.json();
  return json.data as AdminRating;
}
