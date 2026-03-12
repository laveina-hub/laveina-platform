import { z } from "zod";

export const generateOtpSchema = z.object({
  shipment_id: z.string().uuid("Invalid shipment ID"),
});

export const verifyOtpSchema = z.object({
  shipment_id: z.string().uuid("Invalid shipment ID"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export type GenerateOtpInput = z.infer<typeof generateOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
