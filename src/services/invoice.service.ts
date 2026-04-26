import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiResponse } from "@/types/api";

// One Stripe Checkout session = one payment = one invoice. Multi-parcel
// bookings land as N shipments sharing a `stripe_checkout_session_id`; the
// invoice lists them as line items and sums to the paid amount.
//
// Invoice number format: `INV-{YYYY}-{NNNNNN}` — global per-year sequence.
// Computed at render time by counting distinct session ids with a payment
// date in the same year, up to and including the current one. Stable as
// long as no prior shipments are deleted. When Laveina scales enough that
// AEAT-compliant invoice gap-proof numbering matters, promote this to a
// dedicated `invoice_number` column + DB sequence (one-migration follow-up).

export type PaymentRow = {
  stripe_checkout_session_id: string;
  payment_date: string;
  total_cents: number;
  parcel_count: number;
  tracking_ids: string[];
};

export type InvoiceShipment = {
  id: string;
  tracking_id: string;
  parcel_preset_slug: string | null;
  parcel_size: string;
  origin_name: string;
  destination_name: string;
  delivery_mode: string;
  delivery_speed: string;
  price_cents: number;
  insurance_amount_cents: number;
  insurance_surcharge_cents: number;
};

export type InvoiceData = {
  invoice_number: string;
  payment_date: string;
  session_id: string;
  payment_intent_id: string | null;
  customer: {
    full_name: string;
    email: string;
  };
  shipments: InvoiceShipment[];
  total_cents: number;
};

/** List the current customer's payments, grouped by Stripe session id. */
export async function listCustomerPayments(customerId: string): Promise<ApiResponse<PaymentRow[]>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shipments")
    .select("stripe_checkout_session_id, created_at, price_cents, tracking_id")
    .eq("customer_id", customerId)
    .not("stripe_checkout_session_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: { message: error.message, code: "DB_ERROR", status: 500 } };
  }

  const bySession = new Map<string, PaymentRow>();
  for (const row of data ?? []) {
    const sid = row.stripe_checkout_session_id;
    if (!sid) continue;
    const existing = bySession.get(sid);
    if (!existing) {
      bySession.set(sid, {
        stripe_checkout_session_id: sid,
        payment_date: row.created_at,
        total_cents: row.price_cents,
        parcel_count: 1,
        tracking_ids: [row.tracking_id],
      });
      continue;
    }
    existing.total_cents += row.price_cents;
    existing.parcel_count += 1;
    existing.tracking_ids.push(row.tracking_id);
    // Earliest timestamp is the payment date (all shipments in a session are
    // created near-simultaneously by the webhook).
    if (row.created_at < existing.payment_date) {
      existing.payment_date = row.created_at;
    }
  }

  const sorted = Array.from(bySession.values()).sort((a, b) =>
    b.payment_date.localeCompare(a.payment_date)
  );
  return { data: sorted, error: null };
}

type RawShipmentRow = {
  id: string;
  tracking_id: string;
  parcel_preset_slug: string | null;
  parcel_size: string;
  delivery_mode: string;
  delivery_speed: string;
  price_cents: number;
  insurance_amount_cents: number;
  insurance_surcharge_cents: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  origin_pickup_point: { name: string } | { name: string }[] | null;
  destination_pickup_point: { name: string } | { name: string }[] | null;
};

function unwrapFkRow<T>(relation: T | T[] | null): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

/** Returns the full invoice for a Stripe session, or a NOT_FOUND error when
 *  the customer has no shipments for that session (ownership mismatch or
 *  bogus id). */
export async function getInvoiceBySession(
  customerId: string,
  sessionId: string
): Promise<ApiResponse<InvoiceData>> {
  const supabase = createAdminClient();

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select(
      "id, tracking_id, parcel_preset_slug, parcel_size, delivery_mode, delivery_speed, price_cents, insurance_amount_cents, insurance_surcharge_cents, stripe_payment_intent_id, created_at, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(name), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name)"
    )
    .eq("stripe_checkout_session_id", sessionId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message, code: "DB_ERROR", status: 500 } };
  }

  // SAFETY: explicit .select() column list matches RawShipmentRow shape
  const rows = (shipments ?? []) as unknown as RawShipmentRow[];
  if (rows.length === 0) {
    return { data: null, error: { message: "Invoice not found", code: "NOT_FOUND", status: 404 } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", customerId)
    .single();

  const paymentDate = rows[0].created_at;
  const invoiceNumber = await computeInvoiceNumber(sessionId, paymentDate);

  const invoiceShipments: InvoiceShipment[] = rows.map((row) => {
    const origin = unwrapFkRow(row.origin_pickup_point);
    const destination = unwrapFkRow(row.destination_pickup_point);
    return {
      id: row.id,
      tracking_id: row.tracking_id,
      parcel_preset_slug: row.parcel_preset_slug,
      parcel_size: row.parcel_size,
      origin_name: origin?.name ?? "",
      destination_name: destination?.name ?? "",
      delivery_mode: row.delivery_mode,
      delivery_speed: row.delivery_speed,
      price_cents: row.price_cents,
      insurance_amount_cents: row.insurance_amount_cents,
      insurance_surcharge_cents: row.insurance_surcharge_cents,
    };
  });

  const totalCents = invoiceShipments.reduce((sum, s) => sum + s.price_cents, 0);

  return {
    data: {
      invoice_number: invoiceNumber,
      payment_date: paymentDate,
      session_id: sessionId,
      payment_intent_id: rows[0].stripe_payment_intent_id,
      customer: {
        full_name: profile?.full_name ?? "",
        email: profile?.email ?? "",
      },
      shipments: invoiceShipments,
      total_cents: totalCents,
    },
    error: null,
  };
}

async function computeInvoiceNumber(sessionId: string, paymentDate: string): Promise<string> {
  const supabase = createAdminClient();
  const year = new Date(paymentDate).getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString();

  // Count distinct session ids in the same year up to and including the
  // current one. Supabase JS doesn't expose SELECT DISTINCT directly, so we
  // dedupe client-side. For a per-year volume under ~1k this stays cheap;
  // swap to an RPC when that's no longer true.
  const { data } = await supabase
    .from("shipments")
    .select("stripe_checkout_session_id")
    .gte("created_at", startOfYear)
    .lte("created_at", paymentDate)
    .not("stripe_checkout_session_id", "is", null)
    .limit(10_000);

  const uniqueSessions = new Set<string>();
  let currentIncluded = false;
  for (const row of data ?? []) {
    const sid = row.stripe_checkout_session_id;
    if (!sid) continue;
    uniqueSessions.add(sid);
    if (sid === sessionId) currentIncluded = true;
  }

  // Defensive: if query didn't return the current session (edge timing),
  // add it so the count is never off-by-one low.
  if (!currentIncluded) uniqueSessions.add(sessionId);

  return `INV-${year}-${String(uniqueSessions.size).padStart(6, "0")}`;
}
