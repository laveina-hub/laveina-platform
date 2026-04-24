import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getPublicRatingSummaries } from "@/services/rating.service";

// Q13.5 — public aggregate rating summary by pickup-point id. Used by the
// /pickup-points page to badge the result list with a star average.

const querySchema = z.object({
  ids: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const rl = publicLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ ids: url.searchParams.get("ids") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }

  const ids = parsed.data.ids
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await getPublicRatingSummaries(ids);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const payload: Record<string, { average: number; count: number }> = {};
  for (const [id, summary] of result.data) {
    payload[id] = { average: summary.averageStars, count: summary.count };
  }

  return NextResponse.json({ data: payload });
}
