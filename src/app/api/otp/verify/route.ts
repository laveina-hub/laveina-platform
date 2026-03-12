/**
 * OTP verify API — POST: validate the one-time password submitted by the pickup point
 * staff to confirm parcel handover to the recipient.
 */
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

    // TODO: Look up stored OTP for this shipment
    // TODO: Verify OTP matches and has not expired
    // TODO: Mark shipment as delivered
    // TODO: Invalidate OTP
    // TODO: Send delivery confirmation notification

    return NextResponse.json({
      success: true,
      message: "OTP verification not yet implemented",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
