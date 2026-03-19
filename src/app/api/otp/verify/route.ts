import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { verifyOtp } from "@/services/otp.service";
import { confirmDelivery } from "@/services/tracking.service";

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
    const result = await verifyOtp({
      shipment_id: body.shipmentId,
      otp: body.otp,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    // If OTP is verified and pickupPointId is provided, confirm delivery
    if (result.data.verified && body.pickupPointId) {
      const deliveryResult = await confirmDelivery(user.id, body.shipmentId, body.pickupPointId);

      if (deliveryResult.error) {
        // OTP was valid but delivery confirmation failed — still return verified
        // so the client knows OTP was correct, but include the delivery error
        return NextResponse.json({
          data: { verified: true, delivered: false, deliveryError: deliveryResult.error.message },
        });
      }

      return NextResponse.json({
        data: { verified: true, delivered: true },
      });
    }

    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
