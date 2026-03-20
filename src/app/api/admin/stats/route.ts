import { NextResponse } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";

export async function GET() {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { supabase, role } = auth;

  if (role !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

  // Single DB round-trip for all aggregate stats via RPC function.
  // Falls back to individual queries if the function hasn't been deployed yet.
  const [statsResult, recentResult] = await Promise.all([
    supabase.rpc("get_admin_dashboard_stats"),
    supabase
      .from("shipments")
      .select(
        "id, tracking_id, status, delivery_mode, parcel_size, price_cents, created_at, sender_name, receiver_name"
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (statsResult.error || !statsResult.data) {
    // Fallback: RPC not deployed yet — use individual count queries
    const [totalResult, pickupPointsResult] = await Promise.all([
      supabase.from("shipments").select("status, price_cents"),
      supabase
        .from("pickup_points")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    const shipments = totalResult.data ?? [];

    const countByStatus = (status: string) => shipments.filter((s) => s.status === status).length;

    return NextResponse.json({
      data: {
        totalShipments: shipments.length,
        waitingAtOrigin: countByStatus("waiting_at_origin"),
        receivedAtOrigin: countByStatus("received_at_origin"),
        inTransit: countByStatus("in_transit"),
        readyForPickup: countByStatus("ready_for_pickup"),
        delivered: countByStatus("delivered"),
        totalRevenueCents: shipments.reduce((sum, s) => sum + (s.price_cents ?? 0), 0),
        activePickupPoints: pickupPointsResult.count ?? 0,
        recentShipments: recentResult.data ?? [],
      },
    });
  }

  // SAFETY: statsResult.data is typed as unknown from rpc() — shape is guaranteed by our SQL function
  const stats = statsResult.data as Record<string, number>;

  return NextResponse.json({
    data: {
      totalShipments: stats.total_shipments ?? 0,
      waitingAtOrigin: stats.waiting_at_origin ?? 0,
      receivedAtOrigin: stats.received_at_origin ?? 0,
      inTransit: stats.in_transit ?? 0,
      readyForPickup: stats.ready_for_pickup ?? 0,
      delivered: stats.delivered ?? 0,
      totalRevenueCents: stats.total_revenue_cents ?? 0,
      activePickupPoints: stats.active_pickup_points ?? 0,
      recentShipments: recentResult.data ?? [],
    },
  });
}
