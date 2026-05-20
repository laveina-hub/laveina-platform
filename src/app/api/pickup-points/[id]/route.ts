import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { getPickupPointById, updatePickupPoint } from "@/services/pickup-point.service";
import { updatePickupPointSchema } from "@/validations/pickup-point.schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await getPickupPointById(id);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { supabase, user, role } = auth;

  const { id } = await params;

  if (role !== "admin") {
    const { data: pickupPoint } = await supabase
      .from("pickup_points")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (pickupPoint?.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body: unknown = await request.json();
  const parsed = updatePickupPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await updatePickupPoint(id, parsed.data);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  after(
    logAuditEvent({
      actor_id: user.id,
      action: "pickup_point.updated",
      resource: "pickup_points",
      resource_id: id,
      metadata: {
        // Only log keys that changed (not values) to keep the audit trail
        // small and avoid storing PII like phone numbers in the metadata blob.
        fields_updated: Object.keys(parsed.data),
        actor_role: role,
      },
    }).catch(() => {})
  );

  return NextResponse.json({ data: result.data });
}
