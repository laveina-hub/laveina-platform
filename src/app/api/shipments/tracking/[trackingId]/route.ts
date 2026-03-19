import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getPublicTrackingData } from "@/services/shipment.service";

type RouteParams = { params: Promise<{ trackingId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { trackingId } = await params;
  const result = await getPublicTrackingData(trackingId);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json(result.data);
}
