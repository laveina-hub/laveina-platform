import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { isValidTransition } from "@/constants/status-transitions";
import { createQrSignedUrl } from "@/lib/qr/generator";
import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
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

  const shipment = result.data;

  if (shipment.qr_code_url) {
    try {
      shipment.qr_code_url = await createQrSignedUrl(shipment.qr_code_url);
    } catch {
      // signed URL generation failed — leave as null so the UI hides the QR section
      shipment.qr_code_url = null;
    }
  }

  return NextResponse.json({ data: shipment });
}

const shipmentStatusValues = Object.values(ShipmentStatus) as [string, ...string[]];

const patchBodySchema = z.object({
  status: z.enum(shipmentStatusValues, {
    errorMap: () => ({ message: "validation.invalidShipmentStatus" }),
  }),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const patchAuth = await verifyAuth();
  if (patchAuth.error) return patchAuth.error;

  if (patchAuth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // SAFETY: parsed.data.status is validated by Zod against the ShipmentStatus enum before this cast
  const newStatus = parsed.data.status as ShipmentStatus;

  // Validate status transition before updating
  const current = await getShipmentById(id);
  if (current.error) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  if (!isValidTransition(current.data.status, newStatus)) {
    return NextResponse.json(
      { error: `Invalid status transition: ${current.data.status} → ${newStatus}` },
      { status: 422 }
    );
  }

  const result = await updateShipmentStatus(id, newStatus);

  if (result.error) {
    return NextResponse.json(
      { error: "Failed to update shipment status" },
      { status: result.error.status }
    );
  }

  return NextResponse.json({ data: result.data });
}
