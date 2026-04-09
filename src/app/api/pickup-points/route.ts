import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { createPickupPoint, listPickupPoints } from "@/services/pickup-point.service";

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

  return NextResponse.json(
    { data: result.data },
    {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    }
  );
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const result = await createPickupPoint(body);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
