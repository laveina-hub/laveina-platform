import { NextResponse } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";
import { cancelSendcloudParcel } from "@/services/sendcloud.service";
import { DeliveryMode } from "@/types/enums";

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
