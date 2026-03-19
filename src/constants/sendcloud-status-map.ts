// ─── SendCloud → Laveina status mapping ──────────────────────────────────────
// SendCloud status IDs: https://support.sendcloud.com/hc/en-us/articles/360057461691
//
// Only the subset of SendCloud statuses that Laveina cares about are mapped.
// Unmapped statuses are treated as no-ops (no status update, still logged).

import { ShipmentStatus } from "@/types/enums";
import type { ShipmentStatus as ShipmentStatusType } from "@/types/enums";

// SendCloud status ID → Laveina ShipmentStatus.
// null means "acknowledge but do not update status".
export const SENDCLOUD_STATUS_MAP: Record<number, ShipmentStatusType | null> = {
  // Announced / label created — parcel not yet picked up by carrier
  1: null,
  // At sorting center
  3: ShipmentStatus.IN_TRANSIT,
  // Delivered
  11: ShipmentStatus.DELIVERED,
  // Delivery attempt failed
  12: null,
  // Out for delivery
  15: ShipmentStatus.IN_TRANSIT,
  // At pickup point / parcel shop
  22: ShipmentStatus.ARRIVED_AT_DESTINATION,
  // Picked up by carrier
  80: ShipmentStatus.IN_TRANSIT,
  // En route to sorting center
  92: ShipmentStatus.IN_TRANSIT,
  // Shipment picked up by SendCloud
  93: ShipmentStatus.IN_TRANSIT,
  // Exception / return
  2000: null,
};

/**
 * Maps a SendCloud status ID to a Laveina ShipmentStatus.
 * Returns null if the status should not trigger a Laveina update.
 */
export function mapSendcloudStatus(sendcloudStatusId: number): ShipmentStatusType | null {
  return SENDCLOUD_STATUS_MAP[sendcloudStatusId] ?? null;
}
