export const ShipmentStatus = {
  PAYMENT_CONFIRMED: "payment_confirmed",
  WAITING_AT_ORIGIN: "waiting_at_origin",
  RECEIVED_AT_ORIGIN: "received_at_origin",
  IN_TRANSIT: "in_transit",
  ARRIVED_AT_DESTINATION: "arrived_at_destination",
  READY_FOR_PICKUP: "ready_for_pickup",
  DELIVERED: "delivered",
} as const;

export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const UserRole = {
  ADMIN: "admin",
  PICKUP_POINT: "pickup_point",
  CUSTOMER: "customer",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ZoneType = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
} as const;

export type ZoneType = (typeof ZoneType)[keyof typeof ZoneType];
