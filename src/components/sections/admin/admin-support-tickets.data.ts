import { formatDateTimeMedium, type Locale } from "@/lib/format";
import { type TicketStatus } from "@/validations/support-ticket.schema";

// Shared types + fetch helpers for the admin support inbox. The row shape
// mirrors `/api/admin/support-tickets` — keep in sync if the joined columns
// change.

export type CustomerStub = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
};

export type AdminTicket = {
  id: string;
  customer_id: string;
  shipment_id: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  customer: CustomerStub | CustomerStub[] | null;
};

export function unwrapCustomer(raw: AdminTicket["customer"]): CustomerStub | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export function formatTicketDateTime(value: string, locale: Locale): string {
  return formatDateTimeMedium(value, locale);
}

export async function fetchTickets(status: TicketStatus | "all"): Promise<AdminTicket[]> {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  const res = await fetch(`/api/admin/support-tickets?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "fetch failed" }));
    throw new Error(body.error ?? "fetch failed");
  }
  const json = await res.json();
  return (json.data ?? []) as AdminTicket[];
}

export async function saveTicket(
  id: string,
  input: { status?: TicketStatus; admin_response?: string }
): Promise<AdminTicket> {
  const res = await fetch(`/api/admin/support-tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "save failed" }));
    throw new Error(body.error ?? "save failed");
  }
  const json = await res.json();
  return json.data as AdminTicket;
}
