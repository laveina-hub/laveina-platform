import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createSupportTicketSchema } from "@/validations/support-ticket.schema";

// Customer-facing support ticket inbox. RLS on `support_tickets` already
// scopes reads + writes to the authenticated customer; the explicit auth
// check yields cleaner 401s on missing session.

export async function GET(request: NextRequest) {
  const rl = publicLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, admin_response, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/support-tickets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
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

  const parsed = createSupportTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      customer_id: user.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      shipment_id: parsed.data.shipment_id ?? null,
    })
    .select("id, subject, message, status, admin_response, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("POST /api/support-tickets:", error);
    return NextResponse.json({ error: "ticket.createFailed" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
