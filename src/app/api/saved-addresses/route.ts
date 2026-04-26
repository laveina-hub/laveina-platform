import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createSavedAddress, listMySavedAddresses } from "@/services/saved-address.service";
import { createSavedAddressSchema } from "@/validations/saved-address.schema";

// A5 — saved addresses CRUD (list + create). Per-user ops go through RLS on
// `saved_addresses`, so every handler verifies auth first and delegates to
// the service which uses the RLS-aware server client.

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

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await assertAuthenticated();
  if (auth instanceof NextResponse) return auth;

  const result = await listMySavedAddresses();
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ data: result.data });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = publicLimiter.check(ip);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await assertAuthenticated();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSavedAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await createSavedAddress(parsed.data);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
