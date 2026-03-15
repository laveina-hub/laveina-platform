import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { trackingId, action } = body;

    if (!trackingId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: trackingId, action" },
        { status: 400 }
      );
    }

    if (!["drop_off", "collect"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'drop_off' or 'collect'" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scan processing not yet implemented",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
