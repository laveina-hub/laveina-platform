import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, rateLimitResponse, scanLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
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

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
