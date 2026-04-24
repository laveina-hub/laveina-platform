import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TEMPLATES,
  enforceMandatory,
  resolveNotificationPrefs,
  type NotificationPrefs,
} from "@/constants/notification-prefs";
import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// A10 (client answer 2026-04-21): customer-owned preferences matrix.
// - GET returns the current merged view (DB row merged onto A10 defaults).
// - PATCH upserts the row and re-forces mandatory templates server-side so
//   tampered clients can't bypass the "cannot disable" rule.
//
// RLS on `notification_preferences` scopes reads + writes to the signed-in
// customer — this handler adds an explicit auth check for cleaner 401s.

const patchSchema = z.object({
  prefs: z.record(
    z.enum(NOTIFICATION_TEMPLATES),
    z.record(z.enum(NOTIFICATION_CHANNELS), z.boolean())
  ),
});

export async function GET(request: NextRequest) {
  const rl = publicLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("prefs, updated_at")
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("GET /api/customer/notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      prefs: resolveNotificationPrefs(data?.prefs),
      updated_at: data?.updated_at ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const rl = publicLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Re-hydrate + enforce mandatory before persist so tampered payloads can't
  // disable a required channel.
  const merged: NotificationPrefs = enforceMandatory(resolveNotificationPrefs(parsed.data.prefs));

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert({ customer_id: user.id, prefs: merged }, { onConflict: "customer_id" })
    .select("prefs, updated_at")
    .single();

  if (error || !data) {
    console.error("PATCH /api/customer/notifications:", error);
    return NextResponse.json({ error: "prefs.upsertFailed" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      prefs: resolveNotificationPrefs(data.prefs),
      updated_at: data.updated_at,
    },
  });
}
