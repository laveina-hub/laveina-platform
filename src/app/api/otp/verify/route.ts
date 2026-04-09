import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, otpLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { verifyOtp } from "@/services/otp.service";
import { confirmDelivery } from "@/services/tracking.service";

const bodySchema = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  pickupPointId: z.string().uuid("Invalid pickup point ID").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = otpLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, user, role } = auth;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (role === "pickup_point") {
      const [{ data: ownedShop }, { data: shipment }] = await Promise.all([
        supabase
          .from("pickup_points")
          .select("id")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .single(),
        supabase
          .from("shipments")
          .select("destination_pickup_point_id")
          .eq("id", parsed.data.shipmentId)
          .single(),
      ]);

      if (!ownedShop || !shipment || shipment.destination_pickup_point_id !== ownedShop.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await verifyOtp({
      shipment_id: parsed.data.shipmentId,
      otp: parsed.data.otp,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    if (result.data.verified && parsed.data.pickupPointId) {
      const deliveryResult = await confirmDelivery(
        user.id,
        parsed.data.shipmentId,
        parsed.data.pickupPointId
      );

      if (deliveryResult.error) {
        // OTP valid but delivery update failed
        return NextResponse.json({
          data: { verified: true, delivered: false, deliveryError: deliveryResult.error.message },
        });
      }

      void logAuditEvent({
        actor_id: user.id,
        action: "delivery.confirmed",
        resource: "shipment",
        resource_id: parsed.data.shipmentId,
        metadata: { pickup_point_id: parsed.data.pickupPointId },
        ip_address: ip,
      });

      return NextResponse.json({
        data: { verified: true, delivered: true },
      });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("POST /api/otp/verify failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
