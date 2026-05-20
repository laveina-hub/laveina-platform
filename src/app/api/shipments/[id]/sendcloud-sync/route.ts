import { after, NextResponse, type NextRequest } from "next/server";

import { mapSendcloudStatusV3 } from "@/constants/sendcloud-status-map";
import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { getSendcloudParcelStatus } from "@/services/sendcloud.service";
import { DeliveryMode } from "@/types/enums";
import type { ShipmentStatus } from "@/types/enums";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = adminLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role, user } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("id, tracking_id, status, delivery_mode, sendcloud_shipment_id, label_url")
      .eq("id", id)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if (shipment.delivery_mode !== DeliveryMode.SENDCLOUD) {
      return NextResponse.json(
        { error: "Only SendCloud shipments can be synced" },
        { status: 400 }
      );
    }

    if (!shipment.sendcloud_shipment_id) {
      return NextResponse.json(
        { error: "Shipment has not been dispatched to SendCloud yet" },
        { status: 400 }
      );
    }

    const result = await getSendcloudParcelStatus(shipment.sendcloud_shipment_id);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 502 });
    }

    const { statusCode, statusMessage, trackingNumber, trackingUrl, labelUrl } = result.data;
    const mappedStatus = mapSendcloudStatusV3(statusCode);
    // SAFETY: DB column is constrained to ShipmentStatus enum values via CHECK constraint
    const oldStatus = shipment.status as ShipmentStatus;

    const updates: Record<string, unknown> = {};
    let statusChanged = false;

    if (mappedStatus && mappedStatus !== oldStatus) {
      updates.status = mappedStatus;
      statusChanged = true;
    }
    if (trackingNumber) updates.carrier_tracking_number = trackingNumber;
    if (labelUrl && !shipment.label_url) updates.label_url = labelUrl;

    if (Object.keys(updates).length > 0) {
      await supabase.from("shipments").update(updates).eq("id", shipment.id);
    }

    if (statusChanged && mappedStatus) {
      await supabase.from("scan_logs").insert({
        shipment_id: shipment.id,
        scanned_by: null,
        pickup_point_id: null,
        old_status: oldStatus,
        new_status: mappedStatus,
      });
    }

    after(
      logAuditEvent({
        actor_id: user.id,
        action: "shipment.force_sync",
        resource: "shipment",
        resource_id: shipment.id,
        metadata: {
          sendcloud_status_code: statusCode,
          mapped_status: mappedStatus ?? oldStatus,
          status_changed: statusChanged,
        },
      }).catch(() => {})
    );

    return NextResponse.json({
      data: {
        sendcloudStatusCode: statusCode,
        sendcloudStatusMessage: statusMessage,
        mappedStatus: mappedStatus ?? oldStatus,
        statusChanged,
        trackingNumber,
        trackingUrl,
        labelUrl,
      },
    });
  } catch (err) {
    console.error("POST /api/shipments/[id]/sendcloud-sync failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
