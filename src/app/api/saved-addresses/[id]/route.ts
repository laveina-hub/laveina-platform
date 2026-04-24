import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { deleteSavedAddress, updateSavedAddress } from "@/services/saved-address.service";

type RouteCtx = { params: Promise<{ id: string }> };

async function assertAuthenticated(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId: user.id };
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await assertAuthenticated();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await updateSavedAddress(id, body as never);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ data: result.data });
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await assertAuthenticated();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;

  const result = await deleteSavedAddress(id);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ data: result.data });
}
