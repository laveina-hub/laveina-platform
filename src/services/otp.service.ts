import { createHash, randomInt } from "node:crypto";

import { OTP_EXPIRY_MINUTES, OTP_LENGTH } from "@/constants/app";
import { createClient } from "@/lib/supabase/server";
import { sendOtpMessage } from "@/services/notification.service";
import type { ApiResponse } from "@/types/api";
import {
  generateOtpSchema,
  verifyOtpSchema,
  type GenerateOtpInput,
  type VerifyOtpInput,
} from "@/validations/otp.schema";

function generateOtpCode(length: number): string {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += randomInt(0, 10).toString();
  }
  return otp;
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export async function generateOtp(
  input: GenerateOtpInput
): Promise<ApiResponse<{ expires_at: string }>> {
  const parsed = generateOtpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  // Check for an active, unexpired OTP — don't spam the receiver
  const { data: existingOtp } = await supabase
    .from("otp_verifications")
    .select("expires_at")
    .eq("shipment_id", parsed.data.shipment_id)
    .eq("verified", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingOtp) {
    return { data: { expires_at: existingOtp.expires_at }, error: null };
  }

  // Unique index only allows one unverified OTP per shipment — clear expired ones first
  await supabase
    .from("otp_verifications")
    .update({ verified: true })
    .eq("shipment_id", parsed.data.shipment_id)
    .eq("verified", false)
    .lt("expires_at", new Date().toISOString());

  const otp = generateOtpCode(OTP_LENGTH);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Only the hash is stored; concurrent races are caught by the unique index
  const { error } = await supabase.from("otp_verifications").insert({
    shipment_id: parsed.data.shipment_id,
    otp_hash: hashOtp(otp),
    expires_at: expiresAt,
    verified: false,
  });

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  const { data: shipment } = await supabase
    .from("shipments")
    .select("receiver_phone")
    .eq("id", parsed.data.shipment_id)
    .single();

  if (shipment?.receiver_phone) {
    await sendOtpMessage(shipment.receiver_phone, otp, parsed.data.shipment_id);
  }

  return { data: { expires_at: expiresAt }, error: null };
}

export async function verifyOtp(
  input: VerifyOtpInput
): Promise<ApiResponse<{ verified: boolean }>> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  const otpHash = hashOtp(parsed.data.otp);

  const { data, error } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("shipment_id", parsed.data.shipment_id)
    .eq("otp_hash", otpHash)
    .eq("verified", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { data: { verified: false }, error: null };
  }

  await supabase.from("otp_verifications").update({ verified: true }).eq("id", data.id);

  return { data: { verified: true }, error: null };
}
