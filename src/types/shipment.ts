import type { Database } from "./database.types";

export type Shipment = Database["public"]["Tables"]["shipments"]["Row"];
export type ShipmentInsert = Database["public"]["Tables"]["shipments"]["Insert"];
export type ShipmentUpdate = Database["public"]["Tables"]["shipments"]["Update"];

export type ShipmentWithRelations = Shipment & {
  origin_pickup_point: Database["public"]["Tables"]["pickup_points"]["Row"];
  destination_pickup_point: Database["public"]["Tables"]["pickup_points"]["Row"];
  customer: Database["public"]["Tables"]["profiles"]["Row"];
  scan_logs: Database["public"]["Tables"]["scan_logs"]["Row"][];
};

export type CreateShipmentInput = {
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  origin_pickup_point_id: string;
  destination_pickup_point_id: string;
  origin_postcode: string;
  destination_postcode: string;
  weight_kg: number;
};

export type PriceBreakdown = {
  base_price_cents: number;
  total_cents: number;
  origin_zone: string;
  destination_zone: string;
  weight_kg: number;
};
