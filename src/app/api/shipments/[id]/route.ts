import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { verifyAuth } from "@/lib/supabase/auth";
import { getShipmentById, updateShipmentStatus } from "@/services/shipment.service";
import { ShipmentStatus } from "@/types/enums";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { supabase, user, role } = auth;

  const { id } = await params;
  const result = await getShipmentById(id);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  if (role === "customer" && result.data.customer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "pickup_point") {
    const { data: ownedShop } = await supabase
      .from("pickup_points")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    const shipment = result.data;
    if (
      !ownedShop ||
      (shipment.origin_pickup_point_id !== ownedShop.id &&
        shipment.destination_pickup_point_id !== ownedShop.id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ data: result.data });
}

const shipmentStatusValues = Object.values(ShipmentStatus) as [string, ...string[]];

const patchBodySchema = z.object({
  status: z.enum(shipmentStatusValues, {
    errorMap: () => ({ message: "Invalid shipment status" }),
  }),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const patchAuth = await verifyAuth();
  if (patchAuth.error) return patchAuth.error;

  if (patchAuth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await updateShipmentStatus(id, parsed.data.status as ShipmentStatus);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
