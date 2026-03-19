import { NextResponse, type NextRequest } from "next/server";

import { isValidTransition } from "@/constants/status-transitions";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  // ── Auth: admin only ───────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Validate input with Zod ────────────────────────────────────────────────
  const body = await request.json();
  const parsed = batchDispatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { shipmentIds } = parsed.data;

  // ── Fetch all shipments with their details ─────────────────────────────────
  const { data: shipments, error: fetchError } = await supabase
    .from("shipments")
    .select(
      "id, tracking_id, status, delivery_mode, delivery_speed, shipping_method_id, receiver_name, receiver_phone, destination_postcode, weight_kg, destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city)"
    )
    .in("id", shipmentIds);

  if (fetchError || !shipments) {
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 });
  }

  // ── Process each shipment with dual delivery logic ─────────────────────────
  const results: DispatchResult[] = [];

  for (const shipment of shipments) {
    const result: DispatchResult = {
      id: shipment.id,
      trackingId: shipment.tracking_id,
      success: false,
    };

    // Validate status transition: must be received_at_origin → in_transit
    if (!isValidTransition(shipment.status, ShipmentStatus.IN_TRANSIT)) {
      result.error = `Invalid status transition: ${shipment.status} → in_transit`;
      results.push(result);
      continue;
    }

    // SAFETY: delivery_mode comes from DB enum column
    const mode = shipment.delivery_mode as string;

    if (mode === DeliveryMode.SENDCLOUD) {
      // ── Path B: SendCloud — create parcel, get label + tracking ───────────
      // SAFETY: destination_pickup_point is loaded via FK join — Supabase returns
      // an array for joins, but .single()-style select returns the first match.
      const destPointRaw = shipment.destination_pickup_point;
      const destPoint = Array.isArray(destPointRaw) ? destPointRaw[0] : destPointRaw;

      const parcelResult = await dispatchParcel({
        shippingMethodId: shipment.shipping_method_id ?? 0,
        receiverName: shipment.receiver_name,
        receiverPhone: shipment.receiver_phone,
        destinationAddress: destPoint?.address ?? "",
        destinationCity: destPoint?.city ?? "",
        destinationPostcode: shipment.destination_postcode,
        weightKg: shipment.weight_kg,
        trackingId: shipment.tracking_id,
      });

      if (parcelResult.error || !parcelResult.data) {
        result.error = parcelResult.error?.message ?? "SendCloud dispatch failed";
        results.push(result);
        continue;
      }

      const parcel = parcelResult.data;
      const labelUrl = parcel.label?.normal_printer?.[0] ?? null;

      // Update shipment with carrier data + status
      const { error: updateError } = await supabase
        .from("shipments")
        .update({
          status: ShipmentStatus.IN_TRANSIT,
          carrier_name: parcel.shipment.name,
          carrier_tracking_number: parcel.tracking_number,
          sendcloud_parcel_id: parcel.id,
          label_url: labelUrl,
        })
        .eq("id", shipment.id);

      if (updateError) {
        result.error = updateError.message;
        results.push(result);
        continue;
      }

      result.success = true;
      result.carrierName = parcel.shipment.name;
      result.carrierTrackingNumber = parcel.tracking_number ?? undefined;
      result.labelUrl = labelUrl ?? undefined;
    } else {
      // ── Path A: Barcelona internal — status change only, no label ─────────
      const { error: updateError } = await supabase
        .from("shipments")
        .update({ status: ShipmentStatus.IN_TRANSIT })
        .eq("id", shipment.id);

      if (updateError) {
        result.error = updateError.message;
        results.push(result);
        continue;
      }

      result.success = true;
    }

    // ── Create scan_log audit trail entry ──────────────────────────────────
    await supabase.from("scan_logs").insert({
      shipment_id: shipment.id,
      old_status: shipment.status,
      new_status: ShipmentStatus.IN_TRANSIT,
      scanned_by: user.id,
      // pickup_point_id is null for admin dispatch (happens from central office)
    });

    results.push(result);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    data: {
      succeeded,
      failed,
      total: shipmentIds.length,
      results,
    },
  });
}
