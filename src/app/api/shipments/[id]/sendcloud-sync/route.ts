import { NextResponse } from "next/server";

import { mapSendcloudStatus } from "@/constants/sendcloud-status-map";
import { verifyAuth } from "@/lib/supabase/auth";
import { getSendcloudParcelStatus } from "@/services/sendcloud.service";
import { DeliveryMode } from "@/types/enums";
import type { ShipmentStatus } from "@/types/enums";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("id, tracking_id, status, delivery_mode, sendcloud_parcel_id, label_url")
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

    if (!shipment.sendcloud_parcel_id) {
      return NextResponse.json(
        { error: "Shipment has not been dispatched to SendCloud yet" },
        { status: 400 }
      );
    }

    const result = await getSendcloudParcelStatus(shipment.sendcloud_parcel_id);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 502 });
    }

    const { statusId, statusMessage, trackingNumber, trackingUrl, labelUrl } = result.data;
    const mappedStatus = mapSendcloudStatus(statusId);
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

    return NextResponse.json({
      data: {
        sendcloudStatusId: statusId,
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
