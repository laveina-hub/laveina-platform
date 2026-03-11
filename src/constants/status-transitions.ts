import { ShipmentStatus } from "@/types/enums";

/**
 * Valid status transitions map.
 * Key = current status, Value = array of allowed next statuses.
 */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: [ShipmentStatus.WAITING_AT_ORIGIN],
  [ShipmentStatus.WAITING_AT_ORIGIN]: [ShipmentStatus.RECEIVED_AT_ORIGIN],
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.ARRIVED_AT_DESTINATION],
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: [ShipmentStatus.READY_FOR_PICKUP],
  [ShipmentStatus.READY_FOR_PICKUP]: [ShipmentStatus.DELIVERED],
  [ShipmentStatus.DELIVERED]: [], // terminal state
};

export const STATUS_LABELS: Record<string, string> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: "Payment Confirmed",
  [ShipmentStatus.WAITING_AT_ORIGIN]: "Waiting at Origin Shop",
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: "Received at Origin Shop",
  [ShipmentStatus.IN_TRANSIT]: "In Transit",
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: "Arrived at Destination Shop",
  [ShipmentStatus.READY_FOR_PICKUP]: "Ready for Pickup",
  [ShipmentStatus.DELIVERED]: "Delivered",
};

export const STATUS_COLORS: Record<string, string> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: "bg-primary-100 text-primary-700",
  [ShipmentStatus.WAITING_AT_ORIGIN]: "bg-warning-100 text-warning-700",
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: "bg-secondary-100 text-secondary-700",
  [ShipmentStatus.IN_TRANSIT]: "bg-tertiary-100 text-tertiary-700",
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: "bg-secondary-100 text-secondary-700",
  [ShipmentStatus.READY_FOR_PICKUP]: "bg-success-100 text-success-700",
  [ShipmentStatus.DELIVERED]: "bg-success-200 text-success-800",
};

export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
