import { ShipmentStatus } from "@/types/enums";

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: [ShipmentStatus.WAITING_AT_ORIGIN],
  [ShipmentStatus.WAITING_AT_ORIGIN]: [ShipmentStatus.RECEIVED_AT_ORIGIN],
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.ARRIVED_AT_DESTINATION],
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: [ShipmentStatus.READY_FOR_PICKUP],
  [ShipmentStatus.READY_FOR_PICKUP]: [ShipmentStatus.DELIVERED],
  [ShipmentStatus.DELIVERED]: [],
};

export const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  [ShipmentStatus.PAYMENT_CONFIRMED]: "shipmentStatus.payment_confirmed",
  [ShipmentStatus.WAITING_AT_ORIGIN]: "shipmentStatus.waiting_at_origin",
  [ShipmentStatus.RECEIVED_AT_ORIGIN]: "shipmentStatus.received_at_origin",
  [ShipmentStatus.IN_TRANSIT]: "shipmentStatus.in_transit",
  [ShipmentStatus.ARRIVED_AT_DESTINATION]: "shipmentStatus.arrived_at_destination",
  [ShipmentStatus.READY_FOR_PICKUP]: "shipmentStatus.ready_for_pickup",
  [ShipmentStatus.DELIVERED]: "shipmentStatus.delivered",
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
