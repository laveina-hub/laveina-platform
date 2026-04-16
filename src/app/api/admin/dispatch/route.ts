import { NextResponse, type NextRequest } from "next/server";

import { isValidTransition } from "@/constants/status-transitions";
import { verifyAuth } from "@/lib/supabase/auth";
import { notifyDispatchFailed } from "@/services/admin-notification.service";
import { logAuditEvent } from "@/services/audit.service";
import { sendInTransit } from "@/services/notification.service";
import { dispatchParcel } from "@/services/sendcloud.service";
import { DeliveryMode, ShipmentStatus } from "@/types/enums";
import { batchDispatchSchema } from "@/validations/admin.schema";

type DispatchResult = {
  id: string;
  trackingId: string;
  success: boolean;
  error?: string;
  carrierName?: string;
  carrierTrackingNumber?: string;
  labelUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, user, role } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = batchDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const dedupedIds = [...new Set(parsed.data.shipmentIds)];
    const shipmentIds = dedupedIds;

    const { data: shipments, error: fetchError } = await supabase
      .from("shipments")
      .select(
        "id, tracking_id, status, delivery_mode, delivery_speed, shipping_method_id, sender_name, sender_phone, receiver_name, receiver_phone, destination_postcode, weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city)"
      )
      .in("id", shipmentIds);

    if (fetchError || !shipments) {
      return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 });
    }

    const results: DispatchResult[] = [];

    for (const shipment of shipments) {
      const result: DispatchResult = {
        id: shipment.id,
        trackingId: shipment.tracking_id,
        success: false,
      };

      if (!isValidTransition(shipment.status, ShipmentStatus.IN_TRANSIT)) {
        result.error = `Invalid status transition: ${shipment.status} → in_transit`;
        results.push(result);
        continue;
      }

      const mode = shipment.delivery_mode as string; // SAFETY: DB enum column

      if (mode === DeliveryMode.SENDCLOUD) {
        if (!shipment.shipping_method_id) {
          result.error = "Missing shipping method — rebook this shipment";
          results.push(result);
          continue;
        }

        // SAFETY: Supabase FK joins can return an array
        const destPointRaw = shipment.destination_pickup_point;
        const destPoint = Array.isArray(destPointRaw) ? destPointRaw[0] : destPointRaw;

        const parcelResult = await dispatchParcel({
          shippingMethodId: shipment.shipping_method_id,
          receiverName: shipment.receiver_name,
          receiverPhone: shipment.receiver_phone,
          destinationAddress: destPoint?.address ?? "",
          destinationCity: destPoint?.city ?? "",
          destinationPostcode: shipment.destination_postcode,
          weightKg: shipment.weight_kg,
          lengthCm: shipment.parcel_length_cm ?? 0,
          widthCm: shipment.parcel_width_cm ?? 0,
          heightCm: shipment.parcel_height_cm ?? 0,
          trackingId: shipment.tracking_id,
        });

        if (parcelResult.error || !parcelResult.data) {
          result.error = parcelResult.error?.message ?? "SendCloud dispatch failed";
          results.push(result);
          continue;
        }

        const parcel = parcelResult.data;
        const labelUrl = parcel.label?.normal_printer?.[0] ?? null;

        const { error: updateError } = await supabase
          .from("shipments")
          .update({
            status: ShipmentStatus.IN_TRANSIT,
            carrier_name: parcel.shipment.name,
            carrier_tracking_number: parcel.tracking_number,
            sendcloud_parcel_id: parcel.id,
            label_url: labelUrl,
          })
          .eq("id", shipment.id)
          .eq("status", shipment.status); // optimistic lock

        if (updateError) {
          result.error = "Failed to update shipment";
          results.push(result);
          continue;
        }

        result.success = true;
        result.carrierName = parcel.shipment.name;
        result.carrierTrackingNumber = parcel.tracking_number ?? undefined;
        result.labelUrl = labelUrl ?? undefined;
      } else {
        const { error: updateError } = await supabase
          .from("shipments")
          .update({ status: ShipmentStatus.IN_TRANSIT })
          .eq("id", shipment.id)
          .eq("status", shipment.status); // optimistic lock

        if (updateError) {
          result.error = "Failed to update shipment";
          results.push(result);
          continue;
        }

        result.success = true;
      }

      await supabase.from("scan_logs").insert({
        shipment_id: shipment.id,
        old_status: shipment.status,
        new_status: ShipmentStatus.IN_TRANSIT,
        scanned_by: user.id,
      });

      void sendInTransit({
        shipmentId: shipment.id,
        senderPhone: shipment.sender_phone,
        senderName: shipment.sender_name,
        trackingId: shipment.tracking_id,
      }).catch(() => {});

      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Notify admin of failed dispatches
    for (const r of results.filter((r) => !r.success)) {
      void notifyDispatchFailed(r.id, r.trackingId, r.error ?? "Unknown error").catch(() => {});
    }

    if (succeeded > 0) {
      void logAuditEvent({
        actor_id: user.id,
        action: "shipments.dispatched",
        resource: "shipment",
        metadata: {
          succeeded,
          failed,
          tracking_ids: results.filter((r) => r.success).map((r) => r.trackingId),
        },
      });
    }

    return NextResponse.json({
      data: {
        succeeded,
        failed,
        total: shipmentIds.length,
        results,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/dispatch failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
