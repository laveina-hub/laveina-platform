import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { listPickupPoints } from "@/services/pickup-point.service";

export async function GET(request: NextRequest) {
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
