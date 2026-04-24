import { NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { verifyAuth } from "@/lib/supabase/auth";
import { listAdminTickets } from "@/services/support-ticket.service";
import { TICKET_STATUSES } from "@/validations/support-ticket.schema";

// Admin-side inbox for support_tickets. RLS policy `support_tickets_admin_all`
// allows admin full access; the explicit role check yields a 403 instead of
// an empty result. Business logic lives in `support-ticket.service.ts`.

export async function GET(request: NextRequest) {
  const rl = adminLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  // SAFETY: narrowed by TICKET_STATUSES.includes() — the right-hand cast only
  // runs when statusParam is one of the literal enum values.
  const status =
    statusParam && (TICKET_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as (typeof TICKET_STATUSES)[number])
      : null;

  const result = await listAdminTickets(status);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }
  return NextResponse.json({ data: result.data });
}
