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

export const DeliveryMode = {
  INTERNAL: "internal",
  SENDCLOUD: "sendcloud",
} as const;

export type DeliveryMode = (typeof DeliveryMode)[keyof typeof DeliveryMode];

export const DeliverySpeed = {
  STANDARD: "standard",
  EXPRESS: "express",
} as const;

export type DeliverySpeed = (typeof DeliverySpeed)[keyof typeof DeliverySpeed];

export const ParcelSize = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
  EXTRA_LARGE: "extra_large",
  XXL: "xxl",
} as const;

export type ParcelSize = (typeof ParcelSize)[keyof typeof ParcelSize];
