import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import {
  generateOtpSchema,
  verifyOtpSchema,
  type GenerateOtpInput,
  type VerifyOtpInput,
} from "@/validations/otp.schema";
import { sendOtpMessage } from "@/services/notification.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OtpVerification = Database["public"]["Tables"]["otp_verifications"]["Row"];

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

// ---------------------------------------------------------------------------
// generateOtp
// ---------------------------------------------------------------------------

/**
 * Generates a 6-digit OTP for delivery confirmation.
 *
 * Steps:
 *  1. Validate shipment_id
 *  2. Generate a cryptographically random 6-digit code
 *  3. Hash the OTP (e.g. SHA-256)
 *  4. Store the hash + expiry in otp_verifications table
 *  5. Send the plain-text OTP to the receiver via Gallabox WhatsApp
 *  6. Return success (never expose the OTP in the API response)
 */
export async function generateOtp(
  input: GenerateOtpInput,
): Promise<ApiResponse<{ expires_at: string }>> {
  // TODO: Validate input with generateOtpSchema.parse(input)
  // TODO: Fetch shipment to get receiver_phone
  // TODO: Generate random 6-digit OTP
  // TODO: Hash OTP with crypto.subtle.digest or crypto.createHash
  // TODO: Calculate expires_at = now + OTP_EXPIRY_MINUTES
  // TODO: Invalidate any existing un-verified OTPs for this shipment
  // TODO: Insert new otp_verifications row
  // TODO: Call sendOtpMessage(receiver_phone, otp)
  // TODO: Return { expires_at }

  const supabase = await createClient();

  throw new Error("Not implemented");
}

// ---------------------------------------------------------------------------
// verifyOtp
// ---------------------------------------------------------------------------

/**
 * Verifies a 6-digit OTP for delivery confirmation.
 *
 * Steps:
 *  1. Validate input (shipment_id + otp)
 *  2. Hash the provided OTP
 *  3. Look up the latest un-verified otp_verifications row for this shipment
 *  4. Compare hashes and check expiry
 *  5. Mark as verified
 *  6. Update shipment status to "delivered"
 */
export async function verifyOtp(
  input: VerifyOtpInput,
): Promise<ApiResponse<{ verified: boolean }>> {
  // TODO: Validate input with verifyOtpSchema.parse(input)
  // TODO: Hash the provided OTP
  // TODO: Query otp_verifications where shipment_id matches, verified = false
  //       order by created_at desc, limit 1
  // TODO: Return 400 if no pending OTP found
  // TODO: Check expires_at > now, return 400 if expired
  // TODO: Compare otp_hash, return 400 if mismatch
  // TODO: Update otp_verifications row to verified = true
  // TODO: Update shipment status to "delivered"
  // TODO: Return { verified: true }

  const supabase = await createClient();

  throw new Error("Not implemented");
}
