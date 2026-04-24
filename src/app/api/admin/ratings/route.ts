import { NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { listRatingsForModeration } from "@/services/rating-moderation.service";
import { RATING_STATUSES } from "@/validations/rating.schema";

// A11 moderation inbox. RLS policy `ratings_admin_all` allows admin full
// access; the explicit role check yields a 403 instead of an empty result.
// Business logic lives in `rating-moderation.service.ts`.

export async function GET(request: NextRequest) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  // SAFETY: narrowed by the RATING_STATUSES.includes() check — the cast on
  // the right-hand side only runs when statusParam is one of the literal
  // enum values.
  const status =
    statusParam && (RATING_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as (typeof RATING_STATUSES)[number])
      : null;

  const result = await listRatingsForModeration(status);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ data: result.data });
}
