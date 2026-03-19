import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createQrSignedUrl } from "@/lib/qr/generator";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/shipments/by-session?session_id=<stripe_checkout_session_id>
 *
 * Returns the shipment created for a given Stripe Checkout session.
 * Used by the /book/success page to display confirmation details.
 * Auth required — returns only if the shipment belongs to the calling user.
 *
 * qr_code_url in the DB stores the storage file path (private bucket).
 * This route exchanges it for a 7-day signed URL before returning to the client.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shipments")
      .select(
        "id, tracking_id, qr_code_url, status, parcel_size, weight_kg, delivery_mode, delivery_speed, price_cents, created_at, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(name, address, city), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city)"
      )
      .eq("stripe_checkout_session_id", sessionId)
      .eq("customer_id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Exchange the stored file path for a signed URL (private bucket)
    let qrSignedUrl: string | null = null;
    if (data.qr_code_url) {
      try {
        qrSignedUrl = await createQrSignedUrl(data.qr_code_url);
      } catch {
        // Non-fatal: QR may still be generating (webhook latency). Client retries.
      }
    }

    return NextResponse.json({ data: { ...data, qr_code_url: qrSignedUrl } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
