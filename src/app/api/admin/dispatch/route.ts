import { NextResponse, type NextRequest } from "next/server";

import { isValidTransition } from "@/constants/status-transitions";
import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { notifyDispatchFailed } from "@/services/admin-notification.service";
import { getAllSettings, getSettingString } from "@/services/admin-settings.service";
import { logAuditEvent } from "@/services/audit.service";
import { sendInTransitEmail } from "@/services/email-templates.service";
import { sendInTransit } from "@/services/notification.service";
import { dispatchShipmentBundle } from "@/services/sendcloud.service";
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
    const rl = adminLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

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
        "id, tracking_id, status, delivery_mode, delivery_speed, shipping_method_id, shipping_option_code, stripe_checkout_session_id, sender_first_name, sender_last_name, sender_phone, sender_email, receiver_first_name, receiver_last_name, receiver_phone, destination_postcode, weight_kg, parcel_length_cm, parcel_width_cm, parcel_height_cm, preferred_locale, destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city)"
      )
      .in("id", shipmentIds);

    if (fetchError || !shipments) {
      return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 });
    }

    // v3 requires a full from_address on every /shipments request. Pull the
    // warehouse coordinates from admin_settings once per batch instead of
    // per-parcel to avoid N round-trips.
    const settings = await getAllSettings();
    const senderAddress = {
      name: getSettingString(settings, "sendcloud_sender_name", "Laveina"),
      address: getSettingString(settings, "sendcloud_sender_address", ""),
      city: getSettingString(settings, "sendcloud_sender_city", ""),
      postcode: getSettingString(settings, "sendcloud_sender_postcode", ""),
      phone: getSettingString(settings, "sendcloud_sender_phone", ""),
    };

    const results: DispatchResult[] = [];

    type ShipmentRow = (typeof shipments)[number];

    // Group shipments by stripe_checkout_session_id so siblings from the same
    // booking dispatch as ONE SendCloud shipment (N parcels, one waybill, one
    // carrier pickup). BCN internal shipments don't call SendCloud — they only
    // flip status — so grouping doesn't matter for them and we process them
    // individually below.
    const sendcloudGroups = new Map<string, ShipmentRow[]>();
    const bcnShipments: ShipmentRow[] = [];
    const ungroupable: ShipmentRow[] = [];

    for (const shipment of shipments) {
      const mode = shipment.delivery_mode as string;
      if (mode === DeliveryMode.SENDCLOUD) {
        const session = shipment.stripe_checkout_session_id;
        if (!session) {
          ungroupable.push(shipment);
          continue;
        }
        const bucket = sendcloudGroups.get(session) ?? [];
        bucket.push(shipment);
        sendcloudGroups.set(session, bucket);
      } else {
        bcnShipments.push(shipment);
      }
    }

    // Handle unique post-dispatch side-effects (scan log + in-transit notify).
    async function markDispatched(shipment: ShipmentRow): Promise<void> {
      await supabase.from("scan_logs").insert({
        shipment_id: shipment.id,
        old_status: shipment.status,
        new_status: ShipmentStatus.IN_TRANSIT,
        scanned_by: user.id,
      });

      const dispatchSenderName =
        `${shipment.sender_first_name ?? ""} ${shipment.sender_last_name ?? ""}`.trim();
      void sendInTransit({
        shipmentId: shipment.id,
        senderPhone: shipment.sender_phone,
        senderName: dispatchSenderName,
        trackingId: shipment.tracking_id,
      }).catch(() => {});
      void sendInTransitEmail({
        shipmentId: shipment.id,
        to: shipment.sender_email,
        senderName: dispatchSenderName,
        trackingId: shipment.tracking_id,
        locale: shipment.preferred_locale,
      }).catch(() => {});
    }

    // --- SendCloud bundles (one /shipments call per booking) ---
    for (const [session, siblings] of sendcloudGroups) {
      const head = siblings[0];

      // Every sibling must share shipping_option_code, receiver and destination
      // — they come from the same booking. If any is missing the option code
      // (legacy row), fail the whole bundle and surface per-row errors.
      const missingOption = siblings.filter((s) => !s.shipping_option_code);
      if (missingOption.length > 0) {
        for (const s of siblings) {
          results.push({
            id: s.id,
            trackingId: s.tracking_id,
            success: false,
            error: "Missing shipping option code — rebook this shipment",
          });
        }
        continue;
      }

      const invalidTransition = siblings.filter(
        (s) => !isValidTransition(s.status, ShipmentStatus.IN_TRANSIT)
      );
      if (invalidTransition.length > 0) {
        for (const s of siblings) {
          results.push({
            id: s.id,
            trackingId: s.tracking_id,
            success: false,
            error: `Invalid status transition: ${s.status} → in_transit`,
          });
        }
        continue;
      }

      // SAFETY: Supabase FK joins can return an array
      const destPointRaw = head.destination_pickup_point;
      const destPoint = Array.isArray(destPointRaw) ? destPointRaw[0] : destPointRaw;

      const bundle = await dispatchShipmentBundle({
        shippingOptionCode: head.shipping_option_code!,
        receiverName: `${head.receiver_first_name ?? ""} ${head.receiver_last_name ?? ""}`.trim(),
        receiverPhone: head.receiver_phone,
        destinationAddress: destPoint?.address ?? "",
        destinationCity: destPoint?.city ?? "",
        destinationPostcode: head.destination_postcode,
        senderName: senderAddress.name,
        senderPhone: senderAddress.phone,
        senderAddress: senderAddress.address,
        senderCity: senderAddress.city,
        senderPostcode: senderAddress.postcode,
        parcels: siblings.map((s) => ({
          trackingId: s.tracking_id,
          weightKg: s.weight_kg,
          lengthCm: s.parcel_length_cm ?? 0,
          widthCm: s.parcel_width_cm ?? 0,
          heightCm: s.parcel_height_cm ?? 0,
        })),
        orderReference: session,
      });

      if (bundle.error || !bundle.data) {
        const message = bundle.error?.message ?? "SendCloud dispatch failed";
        for (const s of siblings) {
          results.push({
            id: s.id,
            trackingId: s.tracking_id,
            success: false,
            error: message,
          });
        }
        continue;
      }

      // Correlate returned parcels back to shipment rows via the tracking id
      // we sent as `order_number`. SendCloud preserves input order; fall back
      // to index if the API echoes a different order.
      for (let i = 0; i < siblings.length; i++) {
        const row = siblings[i];
        const dispatched = bundle.data.parcels[i];
        const result: DispatchResult = {
          id: row.id,
          trackingId: row.tracking_id,
          success: false,
        };

        if (!dispatched) {
          result.error = "SendCloud returned fewer parcels than requested";
          results.push(result);
          continue;
        }

        const { error: updateError } = await supabase
          .from("shipments")
          .update({
            status: ShipmentStatus.IN_TRANSIT,
            carrier_name: dispatched.carrierName,
            carrier_tracking_number: dispatched.trackingNumber,
            sendcloud_shipment_id: dispatched.sendcloudShipmentId,
            sendcloud_parcel_id: dispatched.sendcloudParcelId,
            label_url: dispatched.labelUrl,
          })
          .eq("id", row.id)
          .eq("status", row.status); // optimistic lock

        if (updateError) {
          result.error = "Failed to update shipment";
          results.push(result);
          continue;
        }

        result.success = true;
        result.carrierName = dispatched.carrierName ?? undefined;
        result.carrierTrackingNumber = dispatched.trackingNumber ?? undefined;
        result.labelUrl = dispatched.labelUrl ?? undefined;
        await markDispatched(row);
        results.push(result);
      }
    }

    // --- Ungroupable SendCloud rows (missing session id — legacy) ---
    for (const shipment of ungroupable) {
      results.push({
        id: shipment.id,
        trackingId: shipment.tracking_id,
        success: false,
        error: "Shipment missing stripe_checkout_session_id; cannot bundle dispatch",
      });
    }

    // --- BCN internal (no SendCloud call — just flip status) ---
    for (const shipment of bcnShipments) {
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
      await markDispatched(shipment);
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
