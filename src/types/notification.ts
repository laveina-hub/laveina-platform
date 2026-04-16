export const NotificationType = {
  NEW_BOOKING_PAID: "new_booking_paid",
  PARCEL_RECEIVED_AT_ORIGIN: "parcel_received_at_origin",
  DISPATCH_FAILED: "dispatch_failed",
  DELIVERY_PROBLEM: "delivery_problem",
  PARCEL_RETURNED: "parcel_returned",
  PARCEL_DELIVERED: "parcel_delivered",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export type AdminNotification = {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: "unread" | "read";
  title: string;
  description: string | null;
  shipment_id: string | null;
  tracking_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};
