import { env } from "@/env";
import { sendWhatsAppMessage } from "@/lib/gallabox/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationPriority, NotificationType } from "@/types/notification";

type CreateNotificationParams = {
  type: NotificationType;
  priority: "low" | "normal" | "high" | "critical";
  title: string;
  description: string;
  shipmentId?: string;
  trackingId?: string;
  metadata?: Record<string, unknown>;
};

export async function createAdminNotification(params: CreateNotificationParams): Promise<void> {
  const supabase = createAdminClient();

  // Dedup: skip if same type + shipment already has an unread notification within last hour
  if (params.shipmentId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("admin_notifications")
      .select("id")
      .eq("type", params.type)
      .eq("shipment_id", params.shipmentId)
      .eq("status", "unread")
      .gte("created_at", oneHourAgo)
      .limit(1)
      .single();

    if (existing) return;
  }

  await supabase.from("admin_notifications").insert({
    type: params.type,
    priority: params.priority,
    title: params.title,
    description: params.description,
    shipment_id: params.shipmentId ?? null,
    tracking_id: params.trackingId ?? null,
    metadata: params.metadata ?? {},
  });

  if (params.priority === NotificationPriority.CRITICAL) {
    void sendCriticalWhatsAppAlert(params).catch((err) => {
      console.error("Admin WhatsApp alert failed:", err);
    });
  }
}

async function sendCriticalWhatsAppAlert(params: CreateNotificationParams): Promise<void> {
  const adminPhone = env.ADMIN_WHATSAPP_PHONE;
  if (!adminPhone) return;

  await sendWhatsAppMessage(adminPhone, "admin_critical_alert", [
    { name: "title", value: params.title },
    { name: "description", value: params.description },
    { name: "tracking_id", value: params.trackingId ?? "N/A" },
  ]);
}

// --- Convenience functions per event type ---

export async function notifyNewBookingPaid(shipmentId: string, trackingId: string): Promise<void> {
  await createAdminNotification({
    type: NotificationType.NEW_BOOKING_PAID,
    priority: "normal",
    title: "notifications.newBookingPaid.title",
    description: "notifications.newBookingPaid.description",
    shipmentId,
    trackingId,
    metadata: { trackingId },
  });
}

export async function notifyParcelReceivedAtOrigin(
  shipmentId: string,
  trackingId: string
): Promise<void> {
  await createAdminNotification({
    type: NotificationType.PARCEL_RECEIVED_AT_ORIGIN,
    priority: "low",
    title: "notifications.parcelReceivedAtOrigin.title",
    description: "notifications.parcelReceivedAtOrigin.description",
    shipmentId,
    trackingId,
    metadata: { trackingId },
  });
}

export async function notifyDispatchFailed(
  shipmentId: string,
  trackingId: string,
  errorMessage: string
): Promise<void> {
  await createAdminNotification({
    type: NotificationType.DISPATCH_FAILED,
    priority: "high",
    title: "notifications.dispatchFailed.title",
    description: "notifications.dispatchFailed.description",
    shipmentId,
    trackingId,
    metadata: { trackingId, error: errorMessage },
  });
}

export async function notifyDeliveryProblem(
  shipmentId: string,
  trackingId: string,
  sendcloudStatusId: number,
  statusMessage: string
): Promise<void> {
  await createAdminNotification({
    type: NotificationType.DELIVERY_PROBLEM,
    priority: "critical",
    title: "notifications.deliveryProblem.title",
    description: "notifications.deliveryProblem.description",
    shipmentId,
    trackingId,
    metadata: { trackingId, statusMessage, sendcloudStatusId },
  });
}

export async function notifyParcelReturned(shipmentId: string, trackingId: string): Promise<void> {
  await createAdminNotification({
    type: NotificationType.PARCEL_RETURNED,
    priority: "critical",
    title: "notifications.parcelReturned.title",
    description: "notifications.parcelReturned.description",
    shipmentId,
    trackingId,
    metadata: { trackingId },
  });
}

export async function notifyParcelDelivered(shipmentId: string, trackingId: string): Promise<void> {
  await createAdminNotification({
    type: NotificationType.PARCEL_DELIVERED,
    priority: "low",
    title: "notifications.parcelDelivered.title",
    description: "notifications.parcelDelivered.description",
    shipmentId,
    trackingId,
    metadata: { trackingId },
  });
}
