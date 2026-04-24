import { NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { notificationPatchSchema } from "@/validations/admin.schema";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = adminLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = notificationPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { error } = await supabase
      .from("admin_notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }

    return NextResponse.json({ data: { id, status: "read" } });
  } catch (err) {
    console.error("PATCH /api/admin/notifications/[id] failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
