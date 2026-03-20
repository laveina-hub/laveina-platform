import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { mapSendcloudStatus } from "@/constants/sendcloud-status-map";
import { env } from "@/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStatusUpdate } from "@/services/notification.service";
import type { ShipmentStatus } from "@/types/enums";

/**
 * POST /api/webhooks/sendcloud
 *
 * Handles SendCloud webhook notifications for parcel status updates.
 *
 * Flow:
 *   1. Verify HMAC signature using SENDCLOUD_SECRET_KEY.
 *   2. Map SendCloud status to Laveina ShipmentStatus.
 *   3. Update shipment row if a valid mapping exists.
 *   4. Log the event in scan_logs.
 *   5. Send WhatsApp notification (best-effort).
 *
 * SendCloud webhook payload structure:
 * {
 *   "action": "parcel_status_changed",
 *   "timestamp": 1234567890,
 *   "parcel": {
 *     "id": 12345,
 *     "tracking_number": "...",
 *     "status": { "id": 3, "message": "At sorting center" },
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("sendcloud-signature");

  // Verify webhook signature
  if (!verifySignature(body, signature)) {
    console.error("SendCloud webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SendCloudWebhookPayload;
  try {
    payload = JSON.parse(body) as SendCloudWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process parcel status changes
  if (payload.action !== "parcel_status_changed") {
    return NextResponse.json({ received: true });
  }

  const parcel = payload.parcel;
  if (!parcel?.id || !parcel.status?.id) {
    return NextResponse.json({ error: "Missing parcel data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find shipment by SendCloud parcel ID
  const { data: shipment, error: findError } = await supabase
    .from("shipments")
    .select("*")
    .eq("sendcloud_parcel_id", parcel.id)
    .single();

  if (findError || !shipment) {
    // Parcel not found — may be from a different system or already deleted
    console.warn(`SendCloud webhook: no shipment for parcel ${parcel.id}`);
    return NextResponse.json({ received: true });
  }

  // Map SendCloud status to Laveina status
  const newStatus = mapSendcloudStatus(parcel.status.id);
  const oldStatus = shipment.status as ShipmentStatus;

  // Idempotency: if the status hasn't changed, acknowledge without re-processing
  if (!newStatus || newStatus === oldStatus) {
    return NextResponse.json({ received: true });
  }

  // Check for duplicate webhook (same shipment + same new_status in scan_logs)
  const { data: existingLog } = await supabase
    .from("scan_logs")
    .select("id")
    .eq("shipment_id", shipment.id)
    .eq("new_status", newStatus)
    .is("scanned_by", null)
    .limit(1)
    .single();

  if (existingLog) {
    // Already processed this transition from a webhook — idempotent
    return NextResponse.json({ received: true });
  }

  // Log the webhook event in scan_logs
  await supabase.from("scan_logs").insert({
    shipment_id: shipment.id,
    scanned_by: null, // webhook — no human scanner
    pickup_point_id: shipment.destination_pickup_point_id,
    old_status: oldStatus,
    new_status: newStatus,
  });

  // Update shipment status
  if (newStatus !== oldStatus) {
    const { error: updateError } = await supabase
      .from("shipments")
      .update({
        status: newStatus,
        carrier_tracking_number: parcel.tracking_number ?? shipment.carrier_tracking_number,
      })
      .eq("id", shipment.id);

    if (updateError) {
      console.error("SendCloud webhook: status update failed", updateError);
      return NextResponse.json({ error: "Status update failed" }, { status: 500 });
    }

    // Send notification (best-effort)
    void sendStatusUpdate({
      phone: shipment.receiver_phone,
      recipientName: shipment.receiver_name,
      trackingId: shipment.tracking_id,
      oldStatus,
      newStatus,
    }).catch((err) => {
      console.error("SendCloud webhook: notification failed", err);
    });
  }

  return NextResponse.json({ received: true });
}

/**
 * Verify the SendCloud webhook HMAC-SHA256 signature.
 * If SENDCLOUD_SECRET_KEY is not configured, skip verification
 * (development mode).
 */
function verifySignature(body: string, signature: string | null): boolean {
  const secret = env.SENDCLOUD_SECRET_KEY;

  // If secret is not configured, only allow in development
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("SendCloud webhook: SENDCLOUD_SECRET_KEY not configured in production");
      return false;
    }
    console.warn(
      "SendCloud webhook: SENDCLOUD_SECRET_KEY not configured, skipping verification (dev only)"
    );
    return true;
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret).update(body).digest("hex");
  return signature === expectedSignature;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface SendCloudWebhookPayload {
  action: string;
  timestamp: number;
  parcel: {
    id: number;
    tracking_number?: string;
    status: {
      id: number;
      message: string;
    };
  };
}
