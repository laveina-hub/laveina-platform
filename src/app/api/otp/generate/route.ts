import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, otpLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { generateOtp } from "@/services/otp.service";

const bodySchema = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
});

/**
 * POST /api/otp/generate
 *
 * Generates a 6-digit OTP for a shipment and sends it via WhatsApp.
 * Auth required. Caller must be a pickup_point staff member whose shop
 * is the destination for this shipment.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = otpLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, user, role } = auth;

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
    // Pickup point staff: can only generate OTP for shipments destined to their shop
    if (role === "pickup_point") {
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
    } else if (role !== "admin") {
      // Customers should not generate OTPs
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await generateOtp({ shipment_id: parsed.data.shipmentId });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("POST /api/otp/generate failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
