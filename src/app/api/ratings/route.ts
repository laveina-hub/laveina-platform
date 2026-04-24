import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createRatingSchema } from "@/validations/rating.schema";

// A11 (client answer 2026-04-21): ratings publish immediately on submit
// (status='approved' by default after migration 00002), and the customer
// can edit within 7 days via PATCH /api/ratings/[id]. RLS
// `ratings_insert_own` + `ratings_update_own` enforce ownership + window.

export async function POST(request: NextRequest) {
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
    const parsed = createRatingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid rating data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("id, tracking_id, customer_id, status, destination_pickup_point_id")
      .eq("id", parsed.data.shipment_id)
      .maybeSingle();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: "shipment.notFound" }, { status: 404 });
    }
    if (shipment.customer_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (shipment.tracking_id !== parsed.data.tracking_id) {
      return NextResponse.json({ error: "tracking_mismatch" }, { status: 400 });
    }
    if (shipment.status !== "delivered") {
      return NextResponse.json({ error: "shipment.notDelivered" }, { status: 422 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("ratings")
      .insert({
        shipment_id: shipment.id,
        customer_id: user.id,
        pickup_point_id: shipment.destination_pickup_point_id,
        stars: parsed.data.stars,
        comment: parsed.data.comment?.trim() || null,
      })
      .select("id, stars, comment, status, created_at")
      .single();

    if (insertError) {
      // UNIQUE (shipment_id, customer_id) — already rated.
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "already_rated" }, { status: 409 });
      }
      console.error("POST /api/ratings insert failed:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/ratings failed:", err);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
