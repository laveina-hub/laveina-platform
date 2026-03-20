import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { listPickupPoints } from "@/services/pickup-point.service";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);
  const { searchParams } = new URL(request.url);

  const includeInactive = searchParams.get("include_inactive") === "true";

  const result = await listPickupPoints({
    postcode: searchParams.get("postcode") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    ...(includeInactive ? { is_active: undefined } : {}),
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
