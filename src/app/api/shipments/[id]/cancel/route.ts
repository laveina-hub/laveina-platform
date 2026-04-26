import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { cancelSendcloudParcel } from "@/services/sendcloud.service";
import { DeliveryMode } from "@/types/enums";

const idSchema = z.string().uuid({ message: "validation.invalidId" });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = adminLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role } = auth;

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

    if (shipment.delivery_mode !== DeliveryMode.SENDCLOUD) {
      return NextResponse.json(
        { error: "Only SendCloud shipments can be cancelled via carrier" },
        { status: 400 }
      );
    }

    if (!shipment.sendcloud_shipment_id) {
      return NextResponse.json(
        { error: "Shipment has not been dispatched to SendCloud yet" },
        { status: 400 }
      );
    }

    const result = await cancelSendcloudParcel(shipment.sendcloud_shipment_id);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("POST /api/shipments/[id]/cancel failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
