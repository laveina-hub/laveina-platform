import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import {
  createPickupPoint,
  listPickupPoints,
  listPickupPointsPaginated,
} from "@/services/pickup-point.service";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);
  const { searchParams } = new URL(request.url);

  const includeInactive = searchParams.get("include_inactive") === "true";
  const pageParam = searchParams.get("page");

  // Paginated path — used by admin dashboard
  if (pageParam) {
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    const result = await listPickupPointsPaginated({
      postcode: searchParams.get("postcode") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      ...(includeInactive ? { is_active: undefined } : {}),
      page,
      pageSize,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json({ data: result.data });
  }

  // Non-paginated path — used by public pickup point selector
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
