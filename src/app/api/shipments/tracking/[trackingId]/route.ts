import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getShipmentByTrackingId } from "@/services/shipment.service";

type RouteParams = { params: Promise<{ trackingId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { trackingId } = await params;
  const result = await getShipmentByTrackingId(trackingId);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
