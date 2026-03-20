import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getPublicTrackingData } from "@/services/shipment.service";

type RouteParams = { params: Promise<{ trackingId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const { trackingId } = await params;
  const result = await getPublicTrackingData(trackingId);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json(result.data);
}
