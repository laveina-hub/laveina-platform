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
    const { shipmentId, otp } = body;

    if (!shipmentId || !otp) {
      return NextResponse.json(
        { error: "Missing required fields: shipmentId, otp" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP verification not yet implemented",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
