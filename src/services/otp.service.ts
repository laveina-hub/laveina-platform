import { createClient } from "@/lib/supabase/server";
import { sendOtpMessage } from "@/services/notification.service";
import type { ApiResponse } from "@/types/api";
import type { Database } from "@/types/database.types";
import {
  generateOtpSchema,
  verifyOtpSchema,
  type GenerateOtpInput,
  type VerifyOtpInput,
} from "@/validations/otp.schema";

type OtpVerification = Database["public"]["Tables"]["otp_verifications"]["Row"];

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

export async function generateOtp(
  input: GenerateOtpInput
): Promise<ApiResponse<{ expires_at: string }>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}

export async function verifyOtp(
  input: VerifyOtpInput
): Promise<ApiResponse<{ verified: boolean }>> {
  const supabase = await createClient();

  throw new Error("Not implemented");
}
