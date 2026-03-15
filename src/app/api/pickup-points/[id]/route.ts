import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getPickupPointById } from "@/services/pickup-point.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await getPickupPointById(id);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
