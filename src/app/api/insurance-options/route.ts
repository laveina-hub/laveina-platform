import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("insurance_options")
      .select("id, coverage_amount_cents, surcharge_cents, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data },
      {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      }
    );
  } catch (err) {
    console.error("GET /api/insurance-options failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
