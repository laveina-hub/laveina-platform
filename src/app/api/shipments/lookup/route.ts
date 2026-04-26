import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getShipmentByTrackingId } from "@/services/shipment.service";

const lookupQuerySchema = z.object({
  trackingId: z
    .string()
    .trim()
    .min(1, "validation.trackingIdRequired")
    .max(64, "validation.trackingIdTooLong")
    .regex(/^[A-Za-z0-9-]+$/, "validation.trackingIdInvalid"),
});

export async function GET(request: NextRequest) {
  const rl = publicLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = lookupQuerySchema.safeParse({
    trackingId: request.nextUrl.searchParams.get("trackingId") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await getShipmentByTrackingId(parsed.data.trackingId);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
