import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getShipmentByTrackingId } from "@/services/shipment.service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trackingId = request.nextUrl.searchParams.get("trackingId");
  if (!trackingId) {
    return NextResponse.json({ error: "trackingId is required" }, { status: 400 });
  }

  const result = await getShipmentByTrackingId(trackingId);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  return NextResponse.json({ data: result.data });
}
