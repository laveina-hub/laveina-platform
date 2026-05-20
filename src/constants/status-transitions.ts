import { ShipmentStatus } from "@/types/enums";

// Happy-path forward transitions for the 7-stage flow. `cancelled` is reachable
// from any pre-delivered state via the admin cancel route — handled separately
// in `isValidTransition` so we don't have to list it on every row.
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: [ShipmentStatus.WAITING_AT_ORIGIN],
  [ShipmentStatus.WAITING_AT_ORIGIN]: [ShipmentStatus.RECEIVED_AT_ORIGIN],
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.ARRIVED_AT_DESTINATION],
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: [ShipmentStatus.READY_FOR_PICKUP],
  [ShipmentStatus.READY_FOR_PICKUP]: [ShipmentStatus.DELIVERED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

/** States from which an admin can cancel. Once a parcel is delivered or
 *  already cancelled, cancel is a no-op (returns 400). */
export const CANCELLABLE_STATUSES: readonly string[] = [
  ShipmentStatus.PAYMENT_CONFIRMED,
  ShipmentStatus.WAITING_AT_ORIGIN,
  ShipmentStatus.RECEIVED_AT_ORIGIN,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.ARRIVED_AT_DESTINATION,
  ShipmentStatus.READY_FOR_PICKUP,
];

export const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: "shipmentStatus.payment_confirmed",
  [ShipmentStatus.WAITING_AT_ORIGIN]: "shipmentStatus.waiting_at_origin",
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: "shipmentStatus.received_at_origin",
  [ShipmentStatus.IN_TRANSIT]: "shipmentStatus.in_transit",
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: "shipmentStatus.arrived_at_destination",
  [ShipmentStatus.READY_FOR_PICKUP]: "shipmentStatus.ready_for_pickup",
  [ShipmentStatus.DELIVERED]: "shipmentStatus.delivered",
  [ShipmentStatus.CANCELLED]: "shipmentStatus.cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: "bg-primary-100 text-primary-700",
  [ShipmentStatus.WAITING_AT_ORIGIN]: "bg-warning-100 text-warning-700",
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: "bg-secondary-100 text-secondary-700",
  [ShipmentStatus.IN_TRANSIT]: "bg-tertiary-100 text-tertiary-700",
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: "bg-secondary-100 text-secondary-700",
  [ShipmentStatus.READY_FOR_PICKUP]: "bg-success-100 text-success-700",
  [ShipmentStatus.DELIVERED]: "bg-success-200 text-success-800",
  [ShipmentStatus.CANCELLED]: "bg-neutral-100 text-neutral-600",
};

export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  // Cancel is allowed from any non-terminal happy-path state.
  if (newStatus === ShipmentStatus.CANCELLED) {
    return CANCELLABLE_STATUSES.includes(currentStatus);
  }
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
