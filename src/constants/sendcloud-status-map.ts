// SendCloud parcel statuses → Laveina shipment statuses.
// Source: GET /api/v2/parcels/statuses (live API, 2026-04-16)
//
// Laveina status lifecycle:
//   in_transit → arrived_at_destination → ready_for_pickup → delivered
//
// Rules:
//   - "Awaiting customer pickup" (12) = parcel at destination shop → ready_for_pickup
//   - "Delivered" (11) / "Shipment collected by customer" (93) = terminal → delivered
//   - Transit statuses (sorting, en route, driver) → in_transit
//   - Failures (unable to deliver, attempt failed) → stay in_transit, admin handles manually
//   - Cancellations → null (handled separately in webhook)

import { ShipmentStatus } from "@/types/enums";
import type { ShipmentStatus as ShipmentStatusType } from "@/types/enums";

export const SENDCLOUD_STATUS_MAP: Record<number, ShipmentStatusType | null> = {
  // --- Announcement / Pre-transit ---
  1: null, // Announced
  999: null, // No label
  1000: null, // Ready to send
  1001: null, // Being announced
  1002: null, // Announcement failed

  // --- In Transit ---
  3: ShipmentStatus.IN_TRANSIT, // En route to sorting center
  5: ShipmentStatus.IN_TRANSIT, // Sorted
  6: ShipmentStatus.IN_TRANSIT, // Not sorted
  7: ShipmentStatus.IN_TRANSIT, // Being sorted
  22: ShipmentStatus.IN_TRANSIT, // Shipment picked up by driver
  91: ShipmentStatus.IN_TRANSIT, // Parcel en route
  92: ShipmentStatus.IN_TRANSIT, // Driver en route

  // --- At Destination / Ready ---
  12: ShipmentStatus.READY_FOR_PICKUP, // Awaiting customer pickup
  62989: ShipmentStatus.IN_TRANSIT, // At Customs

  // --- Delivered (terminal) ---
  11: ShipmentStatus.DELIVERED, // Delivered
  93: ShipmentStatus.DELIVERED, // Shipment collected by customer

  // --- Delivery Issues (stay in_transit, admin notified via logs) ---
  4: ShipmentStatus.IN_TRANSIT, // Delivery delayed
  8: ShipmentStatus.IN_TRANSIT, // Delivery attempt failed
  13: ShipmentStatus.IN_TRANSIT, // Announced: not collected
  15: ShipmentStatus.IN_TRANSIT, // Error collecting
  80: ShipmentStatus.IN_TRANSIT, // Unable to deliver
  62993: ShipmentStatus.IN_TRANSIT, // Delivery method changed
  62994: ShipmentStatus.IN_TRANSIT, // Delivery date changed
  62995: ShipmentStatus.IN_TRANSIT, // Delivery address changed
  62997: ShipmentStatus.IN_TRANSIT, // Address invalid

  // --- Returns / Exceptions (null = logged but no auto-transition) ---
  62991: null, // Refused by recipient
  62992: null, // Returned to sender
  62996: null, // Exception

  // --- Cancellations (null = no status change) ---
  1999: null, // Cancellation requested
  2000: null, // Cancelled
  2001: null, // Submitting cancellation request
  1998: null, // Cancelled upstream
  94: null, // Parcel cancellation failed

  // --- Unknown ---
  1337: null, // Unknown status
  62990: ShipmentStatus.IN_TRANSIT, // At sorting centre
};

export function mapSendcloudStatus(sendcloudStatusId: number): ShipmentStatusType | null {
  return SENDCLOUD_STATUS_MAP[sendcloudStatusId] ?? null;
}

/** Statuses that indicate a delivery problem — admin should be alerted. */
export const SENDCLOUD_PROBLEM_STATUSES = new Set([4, 8, 13, 15, 80, 62991, 62992, 62996, 62997]);

/** Returns true if the SendCloud status indicates a problem needing admin attention. */
export function isSendcloudProblemStatus(statusId: number): boolean {
  return SENDCLOUD_PROBLEM_STATUSES.has(statusId);
}
