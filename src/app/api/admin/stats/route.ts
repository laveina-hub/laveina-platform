import { NextResponse } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";

export async function GET() {
  const auth = await verifyAuth();
  if (auth.error) return auth.error;
  const { supabase, role } = auth;

  if (role !== "admin") {
    return NextResponse.json({ error: { message: "Forbidden", status: 403 } }, { status: 403 });
  }

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
    // RPC unavailable — fall back to individual count queries
    const statuses = [
      "waiting_at_origin",
      "received_at_origin",
      "in_transit",
      "ready_for_pickup",
      "delivered",
    ] as const;

    const [totalResult, revenueResult, pickupPointsResult, ...statusResults] = await Promise.all([
      supabase.from("shipments").select("id", { count: "exact", head: true }),
      supabase.rpc("get_total_revenue_cents"),
      supabase
        .from("pickup_points")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      ...statuses.map((status) =>
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("status", status)
      ),
    ]);

    const revenueCents = (revenueResult.data as number | null) ?? 0;

    return NextResponse.json({
      data: {
        totalShipments: totalResult.count ?? 0,
        waitingAtOrigin: statusResults[0].count ?? 0,
        receivedAtOrigin: statusResults[1].count ?? 0,
        inTransit: statusResults[2].count ?? 0,
        readyForPickup: statusResults[3].count ?? 0,
        delivered: statusResults[4].count ?? 0,
        totalRevenueCents: revenueCents,
        activePickupPoints: pickupPointsResult.count ?? 0,
        recentShipments: recentResult.data ?? [],
      },
    });
  }

  // SAFETY: shape guaranteed by SQL function
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
