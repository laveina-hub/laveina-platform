import type { PickupPointOverride } from "@/lib/pickup-point/working-hours";

import type { Database } from "./database.types";

export type PickupPoint = Database["public"]["Tables"]["pickup_points"]["Row"];
export type PickupPointInsert = Database["public"]["Tables"]["pickup_points"]["Insert"];
export type PickupPointUpdate = Database["public"]["Tables"]["pickup_points"]["Update"];

/**
 * Pickup point plus its override rows (A6 — temporarily-closed windows).
 * Returned by the public list endpoint so the booking wizard can render the
 * "Temporarily Closed" badge + confirm-dialog without a second round trip.
 */
export type PickupPointWithOverrides = PickupPoint & {
  pickup_point_overrides: PickupPointOverride[];
};
