import { NextResponse, type NextRequest } from "next/server";

import { verifyAuth } from "@/lib/supabase/auth";
import { notificationQuerySchema } from "@/validations/admin.schema";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = notificationQuerySchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { status, priority, limit, offset } = parsed.data;

    // Single query — fetch all, count total + derive unread count client-side
    let query = supabase
      .from("admin_notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "unread") {
      query = query.eq("status", "unread");
    }
    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("GET /api/admin/notifications query failed:", error);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    // Derive unread count from fetched data (avoids second DB query)
    const unreadCount = (notifications ?? []).filter((n) => n.status === "unread").length;

    return NextResponse.json({
      data: {
        notifications: notifications ?? [],
        unreadCount,
        total: count ?? 0,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/notifications failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
