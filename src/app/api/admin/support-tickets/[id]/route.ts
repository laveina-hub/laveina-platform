import { after, NextResponse, type NextRequest } from "next/server";

import { adminLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuth } from "@/lib/supabase/auth";
import { logAuditEvent } from "@/services/audit.service";
import { sendSupportReplyEmail } from "@/services/email.service";
import { updateTicketAsAdmin } from "@/services/support-ticket.service";

type CustomerJoin = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
} | null;

function unwrapCustomer(raw: unknown): CustomerJoin {
  if (!raw) return null;
  // SAFETY: when the Supabase join returns an array, element shape matches
  // the CustomerJoin columns selected in `support-ticket.service.ts`.
  if (Array.isArray(raw)) return (raw[0] as CustomerJoin) ?? null;
  // SAFETY: Supabase single-row join returns the CustomerJoin shape directly.
  return raw as CustomerJoin;
}

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

  const result = await updateTicketAsAdmin(id, body);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const ticket = result.data;
  // SAFETY: body is the raw JSON object already accepted by
  // adminSupportTicketUpdateSchema above — the cast just gives us `.admin_response`
  // read access to decide whether to fire the customer notification.
  const adminResponseSet =
    typeof (body as { admin_response?: unknown } | null)?.admin_response === "string";

  after(
    logAuditEvent({
      actor_id: auth.user.id,
      action: "support_ticket.update",
      resource: "support_ticket",
      resource_id: id,
      metadata: { status: ticket.status, admin_response_updated: adminResponseSet },
    }).catch(() => {})
  );

  // Notify the customer whenever the admin writes a response. Fire-and-forget
  // so a provider hiccup doesn't block the admin UI; bypasses the A10 prefs
  // matrix because support replies are transactional responses to a
  // customer-initiated ticket, not broadcasts.
  if (adminResponseSet) {
    const customer = unwrapCustomer(ticket.customer);
    if (customer?.email) {
      void (async () => {
        let locale: string | null = null;
        if (ticket.shipment_id) {
          const adminClient = createAdminClient();
          const { data: shipment } = await adminClient
            .from("shipments")
            .select("preferred_locale")
            .eq("id", ticket.shipment_id)
            .maybeSingle();
          locale = shipment?.preferred_locale ?? null;
        }
        await sendSupportReplyEmail({
          to: customer.email!,
          recipientName: customer.full_name ?? "",
          ticketSubject: ticket.subject,
          locale,
        });
      })().catch((err) => {
        console.error("support reply email failed:", err);
      });
    }
  }

  return NextResponse.json({ data: ticket });
}
