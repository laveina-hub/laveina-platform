import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { OTP_LENGTH, OTP_EXPIRY_MINUTES } from "@/constants/app";
import { createClient } from "@/lib/supabase/server";

function generateOtp(length: number): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

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
    const { shipmentId } = body;

    if (!shipmentId) {
      return NextResponse.json({ error: "Missing required field: shipmentId" }, { status: 400 });
    }

    const otp = generateOtp(OTP_LENGTH);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    console.log(`Generated OTP ${otp} for shipment ${shipmentId}, expires at ${expiresAt}`);

    return NextResponse.json({
      success: true,
      expiresAt,
      message: "OTP sent to recipient",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
