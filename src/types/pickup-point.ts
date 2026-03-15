import type { Database } from "./database.types";

export type PickupPoint = Database["public"]["Tables"]["pickup_points"]["Row"];
export type PickupPointInsert = Database["public"]["Tables"]["pickup_points"]["Insert"];
export type PickupPointUpdate = Database["public"]["Tables"]["pickup_points"]["Update"];
