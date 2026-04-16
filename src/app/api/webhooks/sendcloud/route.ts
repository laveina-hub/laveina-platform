import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isSendcloudProblemStatus, mapSendcloudStatus } from "@/constants/sendcloud-status-map";
import { env } from "@/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyDeliveryProblem,
  notifyParcelDelivered,
  notifyParcelReturned,
} from "@/services/admin-notification.service";
import { sendStatusUpdate } from "@/services/notification.service";
import { ShipmentStatus } from "@/types/enums";
import type { ShipmentStatus as ShipmentStatusType } from "@/types/enums";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("sendcloud-signature");

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

  if (payload.action !== "parcel_status_changed") {
    return NextResponse.json({ received: true });
  }

  const parcel = payload.parcel;
  if (!parcel?.id || !parcel.status?.id) {
    return NextResponse.json({ error: "Missing parcel data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: shipment, error: findError } = await supabase
    .from("shipments")
    .select(
      "id, status, tracking_id, destination_pickup_point_id, sender_phone, sender_name, receiver_phone, receiver_name, carrier_tracking_number"
    )
    .eq("sendcloud_parcel_id", parcel.id)
    .single();

  if (findError || !shipment) {
    console.warn(`SendCloud webhook: no shipment for parcel ${parcel.id}`);
    return NextResponse.json({ received: true });
  }

  const sendcloudStatusId = parcel.status.id;
  const newStatus = mapSendcloudStatus(sendcloudStatusId);
  const oldStatus = shipment.status as ShipmentStatusType;
  const isProblem = isSendcloudProblemStatus(sendcloudStatusId);

  // Log problem statuses and notify admin
  if (isProblem) {
    console.warn(
      `SendCloud webhook: problem status ${sendcloudStatusId} ("${parcel.status.message}") for ${shipment.tracking_id}`
    );
    // Returned/refused → critical return notification
    if (sendcloudStatusId === 62991 || sendcloudStatusId === 62992) {
      void notifyParcelReturned(shipment.id, shipment.tracking_id).catch(() => {});
    } else {
      void notifyDeliveryProblem(
        shipment.id,
        shipment.tracking_id,
        sendcloudStatusId,
        parcel.status.message
      ).catch(() => {});
    }
  }

  if (!newStatus || newStatus === oldStatus) {
    return NextResponse.json({ received: true });
  }

  // Skip if this transition was already processed
  const { data: existingLog } = await supabase
    .from("scan_logs")
    .select("id")
    .eq("shipment_id", shipment.id)
    .eq("new_status", newStatus)
    .is("scanned_by", null)
    .limit(1)
    .single();

  if (existingLog) {
    return NextResponse.json({ received: true });
  }

  await supabase.from("scan_logs").insert({
    shipment_id: shipment.id,
    scanned_by: null, // webhook, not a human scan
    pickup_point_id: shipment.destination_pickup_point_id,
    old_status: oldStatus,
    new_status: newStatus,
  });

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

    void sendStatusUpdate({
      shipmentId: shipment.id,
      phone: shipment.sender_phone,
      recipientName: shipment.sender_name,
      trackingId: shipment.tracking_id,
      oldStatus,
      newStatus,
    }).catch((err) => {
      console.error("SendCloud webhook: notification failed", err);
    });

    if (newStatus === ShipmentStatus.DELIVERED) {
      void notifyParcelDelivered(shipment.id, shipment.tracking_id).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}

function verifySignature(body: string, signature: string | null): boolean {
  const secret = env.SENDCLOUD_SECRET_KEY;

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
  const sigBuf = Buffer.from(signature, "utf-8");
  const expectedBuf = Buffer.from(expectedSignature, "utf-8");
  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}

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
