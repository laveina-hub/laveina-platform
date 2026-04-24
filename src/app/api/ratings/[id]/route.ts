import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { RATING_EDIT_WINDOW_DAYS, updateRatingSchema } from "@/validations/rating.schema";

// A11 (client answer 2026-04-21): customer can edit their own rating within
// 7 days of creation. The RLS policy `ratings_update_own` enforces both
// ownership and the time window; this handler still checks expiry explicitly
// so we can return a clean 403 instead of a silent RLS miss (which would
// surface as 404-like "zero rows").

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const rl = publicLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

    const body = await request.json();
    const parsed = updateRatingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid rating data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Defensive window check — RLS would also reject but this gives a
    // clearer error to the client.
    const { data: existing, error: findError } = await supabase
      .from("ratings")
      .select("id, customer_id, created_at")
      .eq("id", id)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: "rating.notFound" }, { status: 404 });
    }
    if (existing.customer_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const createdMs = Date.parse(existing.created_at);
    const windowMs = RATING_EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > windowMs) {
      return NextResponse.json({ error: "edit_window_expired" }, { status: 403 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("ratings")
      .update({
        stars: parsed.data.stars,
        comment: parsed.data.comment?.trim() || null,
      })
      .eq("id", id)
      .select("id, stars, comment, status, created_at, updated_at")
      .single();

    if (updateError || !updated) {
      console.error("PATCH /api/ratings/[id] failed:", updateError);
      return NextResponse.json({ error: "Failed to update rating" }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("PATCH /api/ratings/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update rating" }, { status: 500 });
  }
}
