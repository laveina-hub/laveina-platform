import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// A4 (client answer 2026-04-21): after Stripe success, the customer can
// opt-in to persisting the sender-override they made on Step 3 back to
// their profile. Only the M2 fields the UI exposes are updatable here;
// role + email are out of scope (email is managed by Supabase Auth).

const patchSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(6).max(32),
  whatsapp: z.string().trim().min(6).max(32).optional().nullable(),
  // Q14.1.10 — kept tight to the routing.locales tuple so we can never
  // store a value the URL middleware doesn't know how to render.
  preferred_locale: z.enum(["es", "ca", "en"]).optional(),
  // Q3.1 — optional home city used for the "Sending from: Name, City"
  // summary on the booking Step 3. Empty string is normalized to null so a
  // cleared input stays cleared in the DB.
  city: z.string().trim().max(100).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // `profiles.full_name` is a single NOT NULL column; join the two halves
    // back together for storage and keep the split-name UI happy on reload
    // (Step 3 splits again on the last whitespace).
    const fullName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();

    const update: {
      full_name: string;
      phone: string;
      whatsapp: string;
      preferred_locale?: string;
      city?: string | null;
    } = {
      full_name: fullName,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp ?? parsed.data.phone,
    };
    if (parsed.data.preferred_locale) {
      update.preferred_locale = parsed.data.preferred_locale;
    }
    if (parsed.data.city !== undefined) {
      update.city = parsed.data.city?.length ? parsed.data.city : null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("id, full_name, phone, whatsapp, preferred_locale, city")
      .single();

    if (error || !data) {
      console.error("PATCH /api/customer/profile failed:", error);
      return NextResponse.json({ error: "profile.updateFailed" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/customer/profile threw:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
