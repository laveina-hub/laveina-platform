import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createQrSignedUrl } from "@/lib/qr/generator";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate via server client (uses cookies / RLS session)
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

    // Use admin client to bypass RLS — auth is already verified above,
    // and customer_id filter ensures users can only see their own shipments.
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("shipments")
      .select(
        "id, tracking_id, qr_code_url, status, parcel_size, weight_kg, delivery_mode, delivery_speed, price_cents, created_at, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(name, address, city), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city)"
      )
      .eq("stripe_checkout_session_id", sessionId)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      console.error("GET /api/shipments/by-session: no shipments found", {
        sessionId,
        customerId: user.id,
        error,
        dataLength: data?.length ?? 0,
      });
      return NextResponse.json({ error: "Shipments not found" }, { status: 404 });
    }

    const shipments = await Promise.all(
      data.map(async (shipment) => {
        let qrSignedUrl: string | null = null;
        if (shipment.qr_code_url) {
          try {
            qrSignedUrl = await createQrSignedUrl(shipment.qr_code_url);
          } catch {
            // QR may still be generating — client retries
          }
        }
        return { ...shipment, qr_code_url: qrSignedUrl };
      })
    );

    return NextResponse.json({ data: shipments });
  } catch (err) {
    console.error("GET /api/shipments/by-session failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
