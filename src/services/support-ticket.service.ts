import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import {
  adminSupportTicketUpdateSchema,
  type TicketStatus,
} from "@/validations/support-ticket.schema";

// Business logic for the admin-side support ticket inbox. RLS policy
// `support_tickets_admin_all` grants admin full CRUD; the route layer still
// runs a role check to return a clean 403 instead of an empty result.

type CustomerJoin = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
};

export type AdminTicketRow = {
  id: string;
  customer_id: string;
  shipment_id: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  customer: CustomerJoin | CustomerJoin[] | null;
};

const TICKET_SELECT =
  "id, customer_id, shipment_id, subject, message, status, admin_response, created_at, updated_at, customer:profiles(id, email, full_name, phone)";

export async function listAdminTickets(
  status: TicketStatus | null
): Promise<ApiResponse<AdminTicketRow[]>> {
  const supabase = await createClient();

  let query = supabase
    .from("support_tickets")
    .select(TICKET_SELECT)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return {
      data: null,
      error: { message: error.message, code: "DB_ERROR", status: 500 },
    };
  }

  // SAFETY: select string is fixed and matches AdminTicketRow field-for-field.
  return { data: (data ?? []) as AdminTicketRow[], error: null };
}

export async function updateTicketAsAdmin(
  id: string,
  input: unknown
): Promise<ApiResponse<AdminTicketRow>> {
  const parsed = adminSupportTicketUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? "invalid_body",
        code: "VALIDATION_ERROR",
        status: 400,
      },
    };
  }

  const updates: Record<string, string> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.admin_response !== undefined) {
    updates.admin_response = parsed.data.admin_response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .update(updates)
    .eq("id", id)
    .select(TICKET_SELECT)
    .single();

  if (error || !data) {
    return {
      data: null,
      error: {
        message: error?.message ?? "Failed to update ticket",
        code: "DB_ERROR",
        status: 500,
      },
    };
  }

  // SAFETY: select string is fixed and matches AdminTicketRow field-for-field.
  return { data: data as AdminTicketRow, error: null };
}
