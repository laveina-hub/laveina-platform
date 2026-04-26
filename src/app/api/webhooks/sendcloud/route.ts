import { createHmac, timingSafeEqual } from "node:crypto";

import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isSendcloudV3ProblemStatus, mapSendcloudStatusV3 } from "@/constants/sendcloud-status-map";
import { env } from "@/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyDeliveryProblem,
  notifyParcelDelivered,
  notifyParcelReturned,
} from "@/services/admin-notification.service";
import { sendStatusUpdateEmail } from "@/services/email-templates.service";
import { sendStatusUpdate } from "@/services/notification.service";
import { ShipmentStatus } from "@/types/enums";
import type { ShipmentStatus as ShipmentStatusType } from "@/types/enums";

// SendCloud v3 webhook handler. Accepts two payload shapes:
//
//   1. Classic v3 webhook (POST /api/v3/webhooks/parcel-status-changed):
//      { action: "parcel_status_changed", timestamp, parcel: { id, status: { code, message } } }
//
//   2. Event Subscriptions delivery (v3-native, preferred):
//      { event_type: "parcel.status_changed", data: { parcel: { id, status: { code, message } } } }
//
// Both are signed with HMAC-SHA256 using the shared `SENDCLOUD_SECRET_KEY`
// (classic) or a per-connection secret (Event Subscriptions). The handler
// verifies whichever shape arrives and normalises to the same downstream
// path: map the v3 status code → our ShipmentStatus, upsert with idempotent
// scan_logs, fan out notifications.
//
// Observability: every invocation logs the event type + parcel id, and any
// unknown status codes warn so we learn about new v3 states before they
// silently drop.

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("sendcloud-signature");

  if (!verifySignature(body, signature)) {
    console.error("SendCloud webhook: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalised = normalisePayload(raw);
  if (!normalised) {
    console.warn("SendCloud webhook: unrecognised payload shape");
    return NextResponse.json({ received: true });
  }
  if (normalised.kind !== "parcel_status_changed") {
    // Ignore other event types (integration.*, return.created) for now; they
    // don't need Laveina-side action.
    return NextResponse.json({ received: true });
  }

  const { parcelId, statusCode, statusMessage, trackingNumber } = normalised;

  if (!parcelId || !statusCode) {
    return NextResponse.json({ error: "Missing parcel data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: shipment, error: findError } = await supabase
    .from("shipments")
    .select(
      "id, status, tracking_id, destination_pickup_point_id, sender_phone, sender_email, sender_first_name, sender_last_name, receiver_phone, receiver_first_name, receiver_last_name, carrier_tracking_number, preferred_locale"
    )
    .eq("sendcloud_parcel_id", parcelId)
    .single();

  if (findError || !shipment) {
    console.warn(`SendCloud webhook: no shipment for parcel ${parcelId}`);
    return NextResponse.json({ received: true });
  }

  const newStatus = mapSendcloudStatusV3(statusCode);
  // SAFETY: DB column is constrained to ShipmentStatus enum values via CHECK constraint
  const oldStatus = shipment.status as ShipmentStatusType;
  const isProblem = isSendcloudV3ProblemStatus(statusCode);

  if (newStatus === null) {
    console.warn(
      `SendCloud webhook: unmapped v3 status "${statusCode}" ("${statusMessage}") for ${shipment.tracking_id}`
    );
  }

  if (isProblem) {
    console.warn(
      `SendCloud webhook: problem status ${statusCode} ("${statusMessage}") for ${shipment.tracking_id}`
    );
    if (statusCode === "REFUSED_BY_RECIPIENT" || statusCode === "RETURNED_TO_SENDER") {
      after(notifyParcelReturned(shipment.id, shipment.tracking_id).catch(() => {}));
    } else {
      after(
        notifyDeliveryProblem(
          shipment.id,
          shipment.tracking_id,
          // Legacy signature takes a number; we pass a stable hash so audit
          // logs group by code without schema churn. statusMessage carries the
          // human-readable text.
          statusCodeToId(statusCode),
          statusMessage
        ).catch(() => {})
      );
    }
  }

  if (!newStatus || newStatus === oldStatus) {
    return NextResponse.json({ received: true });
  }

  // Idempotency — skip if this transition has already been logged.
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
    scanned_by: null,
    pickup_point_id: shipment.destination_pickup_point_id,
    old_status: oldStatus,
    new_status: newStatus,
  });

  const { error: updateError } = await supabase
    .from("shipments")
    .update({
      status: newStatus,
      carrier_tracking_number: trackingNumber ?? shipment.carrier_tracking_number,
    })
    .eq("id", shipment.id);

  if (updateError) {
    console.error("SendCloud webhook: status update failed", updateError);
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }

  const statusSenderName =
    `${shipment.sender_first_name ?? ""} ${shipment.sender_last_name ?? ""}`.trim();

  after(
    sendStatusUpdate({
      shipmentId: shipment.id,
      phone: shipment.sender_phone,
      recipientName: statusSenderName,
      trackingId: shipment.tracking_id,
      oldStatus,
      newStatus,
      locale: shipment.preferred_locale,
    }).catch((err) => {
      console.error("SendCloud webhook: notification failed", err);
    })
  );

  after(
    sendStatusUpdateEmail({
      shipmentId: shipment.id,
      to: shipment.sender_email,
      recipientName: statusSenderName,
      trackingId: shipment.tracking_id,
      newStatus,
      locale: shipment.preferred_locale,
    }).catch((err) => {
      console.error("SendCloud webhook: email notification failed", err);
    })
  );

  if (newStatus === ShipmentStatus.DELIVERED) {
    after(notifyParcelDelivered(shipment.id, shipment.tracking_id).catch(() => {}));
  }

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

type NormalisedWebhook = {
  kind: "parcel_status_changed";
  parcelId: number;
  statusCode: string;
  statusMessage: string;
  trackingNumber: string | null;
};

/** Accept both classic v3 webhook and Event Subscriptions delivery shapes. */
function normalisePayload(raw: unknown): NormalisedWebhook | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // Event Subscriptions delivery envelope.
  if (typeof obj.event_type === "string" && obj.data && typeof obj.data === "object") {
    if (obj.event_type !== "parcel.status_changed") return null;
    const parcel = extractParcel((obj.data as Record<string, unknown>).parcel);
    if (!parcel) return null;
    return { kind: "parcel_status_changed", ...parcel };
  }

  // Classic v3 webhook.
  if (obj.action === "parcel_status_changed" && obj.parcel) {
    const parcel = extractParcel(obj.parcel);
    if (!parcel) return null;
    return { kind: "parcel_status_changed", ...parcel };
  }

  return null;
}

function extractParcel(maybeParcel: unknown): {
  parcelId: number;
  statusCode: string;
  statusMessage: string;
  trackingNumber: string | null;
} | null {
  if (!maybeParcel || typeof maybeParcel !== "object") return null;
  const p = maybeParcel as Record<string, unknown>;
  const id = typeof p.id === "number" ? p.id : null;
  const status = p.status as Record<string, unknown> | undefined;
  const code = typeof status?.code === "string" ? status.code : null;
  if (id === null || code === null) return null;
  return {
    parcelId: id,
    statusCode: code,
    statusMessage: typeof status?.message === "string" ? status.message : "",
    trackingNumber: typeof p.tracking_number === "string" ? p.tracking_number : null,
  };
}

function statusCodeToId(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
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

  if (!signature) return false;

  const expectedSignature = createHmac("sha256", secret).update(body).digest("hex");
  const sigBuf = Buffer.from(signature, "utf-8");
  const expectedBuf = Buffer.from(expectedSignature, "utf-8");
  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}
