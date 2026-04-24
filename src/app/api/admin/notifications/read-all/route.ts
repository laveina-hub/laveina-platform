import { NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";

export async function POST(request: NextRequest) {
  try {
    const rl = adminLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("admin_notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("status", "unread")
      .select("id");

    const count = data?.length ?? 0;

    if (error) {
      return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }

    return NextResponse.json({ data: { updated: count ?? 0 } });
  } catch (err) {
    console.error("POST /api/admin/notifications/read-all failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
