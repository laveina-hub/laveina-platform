import { after, NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { moderateRating } from "@/services/rating-moderation.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await moderateRating(id, body);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  after(
    logAuditEvent({
      actor_id: auth.user.id,
      action: "rating.moderate",
      resource: "rating",
      resource_id: id,
      metadata: { status: result.data.status },
    }).catch(() => {})
  );

  return NextResponse.json({ data: result.data });
}
