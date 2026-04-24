import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp, otpLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { generateOtp, verifyReceiverToken } from "@/services/otp.service";

// Two authorized paths:
//  1. Receiver — `{ shipment_id, token }`, no login. Token is verified so a
//     bare tracking_id can't flood a phone.
//  2. Sender (Q14.1.6) — `{ shipment_id }` only, requires Supabase session
//     owning the shipment. Lets the customer resend the pickup code from
//     their dashboard without handing them the plaintext OTP.

const bodySchema = z.object({
  shipment_id: z.string().uuid(),
  token: z.string().min(16).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = otpLimiter.check(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl.resetMs);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.token) {
      const verify = await verifyReceiverToken(parsed.data.shipment_id, parsed.data.token);
      if (verify.error || !verify.data.valid) {
        return NextResponse.json({ error: "invalid_token" }, { status: 401 });
      }
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }
      const { data: shipment } = await supabase
        .from("shipments")
        .select("id, customer_id, status")
        .eq("id", parsed.data.shipment_id)
        .single();
      if (!shipment || shipment.customer_id !== user.id) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (shipment.status !== "ready_for_pickup") {
        return NextResponse.json({ error: "not_ready_for_pickup" }, { status: 409 });
      }
    }

    // Idempotent — reuses an active OTP or issues a fresh one + token + WhatsApp.
    const result = await generateOtp({ shipment_id: parsed.data.shipment_id });
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: result.error.status });
    }

    return NextResponse.json({ data: { expires_at: result.data.expires_at } });
  } catch (err) {
    console.error("POST /api/otp/resend failed:", err);
    return NextResponse.json({ error: "Failed to resend code" }, { status: 500 });
  }
}
