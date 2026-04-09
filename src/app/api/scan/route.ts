import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, rateLimitResponse, scanLimiter } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { processQrScan } from "@/services/tracking.service";

const scanBodySchema = z.object({
  trackingId: z.string().min(1, "Tracking ID is required"),
  pickupPointId: z.string().uuid("Invalid pickup point ID"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = scanLimiter.check(ip);
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const parsed = scanBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await processQrScan(user.id, {
      tracking_id: parsed.data.trackingId,
      pickup_point_id: parsed.data.pickupPointId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("POST /api/scan failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
