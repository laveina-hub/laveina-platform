import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { CANCELLABLE_STATUSES } from "@/constants/status-transitions";
import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { cancelSendcloudParcel } from "@/services/sendcloud.service";
import { DeliveryMode, ShipmentStatus } from "@/types/enums";
import type { ShipmentStatus as ShipmentStatusType } from "@/types/enums";

// Admin cancel.
//
// What happens locally:
//   1. Block cancel from terminal states (delivered, already cancelled).
//   2. For SendCloud parcels that have already been dispatched, call
//      SendCloud's cancel endpoint first — if the carrier rejects (already
//      shipped, refused, etc.) we bail out without touching local state.
//   3. Flip the local `shipments.status` to `cancelled`. The DB trigger
//      (migration 00002) accepts cancel from any pre-delivered state.
//   4. Record a scan_log entry so the customer-facing timeline shows the
//      cancellation event, and write an audit log so admin actions stay
//      traceable.
//
// SendCloud-only quirks (pre-dispatch): if the parcel has no
// `sendcloud_shipment_id` we still cancel locally — there's nothing for the
// carrier to refund, and the customer-facing parcel still needs to enter the
// `cancelled` state.

const idSchema = z.string().uuid({ message: "validation.invalidId" });

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

    const { id: rawId } = await params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: "Invalid shipment id", details: parsedId.error.flatten() },
        { status: 400 }
      );
    }
    const id = parsedId.data;

    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("id, tracking_id, status, delivery_mode, sendcloud_shipment_id")
      .eq("id", id)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // SAFETY: DB column is constrained to ShipmentStatus enum values via CHECK constraint
    const currentStatus = shipment.status as ShipmentStatusType;

    if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
      return NextResponse.json(
        { error: `Cannot cancel shipment in terminal state '${currentStatus}'` },
        { status: 400 }
      );
    }

    // SendCloud step: cancel at the carrier first so we don't end up with a
    // local row claiming "cancelled" while SendCloud thinks the parcel is
    // still active and waiting for a courier pickup.
    if (shipment.delivery_mode === DeliveryMode.SENDCLOUD && shipment.sendcloud_shipment_id) {
      const carrierResult = await cancelSendcloudParcel(shipment.sendcloud_shipment_id);
      if (carrierResult.error) {
        return NextResponse.json({ error: carrierResult.error.message }, { status: 400 });
      }
    }

    // Flip local status. The DB trigger validates the transition; an
    // optimistic-lock on `.eq("status", currentStatus)` prevents a concurrent
    // scan from racing the cancel.
    const { data: updated, error: updateError } = await supabase
      .from("shipments")
      .update({ status: ShipmentStatus.CANCELLED })
      .eq("id", shipment.id)
      .eq("status", currentStatus)
      .select("id, tracking_id, status")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update local status" },
        { status: 500 }
      );
    }

    // Timeline entry so the customer dashboard shows the cancellation event.
    await supabase.from("scan_logs").insert({
      shipment_id: shipment.id,
      scanned_by: user.id,
      pickup_point_id: null,
      old_status: currentStatus,
      new_status: ShipmentStatus.CANCELLED,
    });

    after(
      logAuditEvent({
        actor_id: user.id,
        action: "shipment.cancelled",
        resource: "shipment",
        resource_id: shipment.id,
        metadata: {
          tracking_id: shipment.tracking_id,
          previous_status: currentStatus,
          delivery_mode: shipment.delivery_mode,
          sendcloud_cancelled: Boolean(shipment.sendcloud_shipment_id),
        },
      }).catch(() => {})
    );

    return NextResponse.json({
      data: {
        id: updated.id,
        tracking_id: updated.tracking_id,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error("POST /api/shipments/[id]/cancel failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
