import { createHash, randomBytes, randomInt } from "node:crypto";

import { OTP_EXPIRY_HOURS, OTP_LENGTH } from "@/constants/app";
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

/** Raw token goes in the URL; only SHA-256 hash persists in the DB. */
function generateReceiverToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function expiryFromNow(): string {
  return new Date(Date.now() + OTP_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
}

export type GenerateOtpResult = {
  expires_at: string;
  /** Raw token for the receiver URL; never persisted (hash-only). */
  receiver_token: string;
};

export async function generateOtp(
  input: GenerateOtpInput
): Promise<ApiResponse<GenerateOtpResult>> {
  const parsed = generateOtpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0].message, code: "VALIDATION_ERROR", status: 400 },
    };
  }

  const supabase = await createClient();

  // Reuse an existing unverified OTP if still valid — but always issue a fresh
  // receiver token so resend links can be invalidated independently.
  const nowIso = new Date().toISOString();
  const { data: existingOtp } = await supabase
    .from("otp_verifications")
    .select("expires_at")
    .eq("shipment_id", parsed.data.shipment_id)
    .eq("verified", false)
    .gte("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingOtp) {
    const receiverToken = await issueReceiverToken(parsed.data.shipment_id, existingOtp.expires_at);
    if (receiverToken.error) return { data: null, error: receiverToken.error };
    return {
      data: { expires_at: existingOtp.expires_at, receiver_token: receiverToken.data },
      error: null,
    };
  }

  // Mark expired OTPs as verified so the unique index allows a new one.
  await supabase
    .from("otp_verifications")
    .update({ verified: true })
    .eq("shipment_id", parsed.data.shipment_id)
    .eq("verified", false)
    .lt("expires_at", nowIso);

  const otp = generateOtpCode(OTP_LENGTH);
  const expiresAt = expiryFromNow();

  // S3.5 (A11-adjacent): we store the OTP plaintext in `display_code` so the
  // receiver page can render the digits directly. Trade-off documented in
  // migration 00002_sprint3.sql: 24h TTL + nulled on verify + no public RLS
  // read (admin client only). Deployments that would rather force the
  // receiver back to WhatsApp can set `display_code: null` on insert without
  // breaking the UI — ReceiverOtpSection already renders empty boxes + hint
  // when the prop is null.
  const { error: otpError } = await supabase.from("otp_verifications").insert({
    shipment_id: parsed.data.shipment_id,
    otp_hash: hashOtp(otp),
    display_code: otp,
    expires_at: expiresAt,
    verified: false,
  });

  if (otpError) {
    return { data: null, error: { message: otpError.message, status: 500 } };
  }

  const tokenResult = await issueReceiverToken(parsed.data.shipment_id, expiresAt);
  if (tokenResult.error) {
    return { data: null, error: tokenResult.error };
  }

  const { data: shipment } = await supabase
    .from("shipments")
    .select("receiver_phone")
    .eq("id", parsed.data.shipment_id)
    .single();

  if (shipment?.receiver_phone) {
    await sendOtpMessage(shipment.receiver_phone, otp, parsed.data.shipment_id);
  }

  return {
    data: { expires_at: expiresAt, receiver_token: tokenResult.data },
    error: null,
  };
}

async function issueReceiverToken(
  shipmentId: string,
  expiresAt: string
): Promise<ApiResponse<string>> {
  const supabase = await createClient();
  const { raw, hash } = generateReceiverToken();

  const { error } = await supabase.from("otp_receiver_tokens").insert({
    shipment_id: shipmentId,
    token_hash: hash,
    expires_at: expiresAt,
  });

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  return { data: raw, error: null };
}

/** Verify the URL token for /pickup/[trackingId]/[token]; stamps last_accessed_at. */
export async function verifyReceiverToken(
  shipmentId: string,
  rawToken: string
): Promise<ApiResponse<{ valid: boolean }>> {
  const supabase = await createClient();
  const hash = createHash("sha256").update(rawToken).digest("hex");

  const { data, error } = await supabase
    .from("otp_receiver_tokens")
    .select("id, expires_at")
    .eq("shipment_id", shipmentId)
    .eq("token_hash", hash)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message, status: 500 } };
  }

  if (data) {
    await supabase
      .from("otp_receiver_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return { data: { valid: !!data }, error: null };
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
    .select("id")
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

  // Null the plaintext on successful verify so a later DB read can't leak it.
  await supabase
    .from("otp_verifications")
    .update({ verified: true, display_code: null })
    .eq("id", data.id);

  return { data: { verified: true }, error: null };
}

/**
 * Fetches the plaintext 6-digit code for the currently active OTP of a
 * shipment. Returns null when no active OTP has a `display_code` stored
 * (old code pre-migration, or already consumed). Server-side only — uses
 * the RLS-aware server client from the caller's session.
 */
export async function getActiveOtpDisplayCode(shipmentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("otp_verifications")
    .select("display_code")
    .eq("shipment_id", shipmentId)
    .eq("verified", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.display_code ?? null;
}
