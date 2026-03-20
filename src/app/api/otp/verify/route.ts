import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, otpLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { verifyOtp } from "@/services/otp.service";
import { confirmDelivery } from "@/services/tracking.service";

const bodySchema = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  pickupPointId: z.string().uuid("Invalid pickup point ID").optional(),
});

/**
 * POST /api/otp/verify
 *
 * Verifies a 6-digit OTP for a shipment. If valid and pickupPointId is provided,
 * also confirms delivery (final status transition).
 * Auth required. Caller must be pickup_point staff at the destination shop, or admin.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = otpLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ────────────────────────────────────────────────────────
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // ── Authorization: verify caller has access to this shipment ──────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (profile.role === "pickup_point") {
      // Find which pickup point this user owns
      const { data: ownedShop } = await supabase
        .from("pickup_points")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      const { data: shipment } = await supabase
        .from("shipments")
        .select("destination_pickup_point_id")
        .eq("id", parsed.data.shipmentId)
        .single();

      if (!ownedShop || !shipment || shipment.destination_pickup_point_id !== ownedShop.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    const result = await verifyOtp({
      shipment_id: parsed.data.shipmentId,
      otp: parsed.data.otp,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    // If OTP is verified and pickupPointId is provided, confirm delivery
    if (result.data.verified && parsed.data.pickupPointId) {
      const deliveryResult = await confirmDelivery(
        user.id,
        parsed.data.shipmentId,
        parsed.data.pickupPointId
      );

      if (deliveryResult.error) {
        // OTP was valid but delivery confirmation failed — still return verified
        // so the client knows OTP was correct, but include the delivery error
        return NextResponse.json({
          data: { verified: true, delivered: false, deliveryError: deliveryResult.error.message },
        });
      }

      return NextResponse.json({
        data: { verified: true, delivered: true },
      });
    }

    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
