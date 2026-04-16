import { z } from "zod";

/** At least one uppercase, one lowercase, one digit, one special character. */
const passwordField = z
  .string()
  .min(8, "validation.passwordMin")
  .max(72, "validation.passwordMax")
  .regex(/[a-z]/, "validation.passwordLowercase")
  .regex(/[A-Z]/, "validation.passwordUppercase")
  .regex(/[0-9]/, "validation.passwordDigit")
  .regex(/[^a-zA-Z0-9]/, "validation.passwordSpecial");

export const loginSchema = z.object({
  email: z.string().email("validation.invalidEmail"),
  password: z.string().min(1, "validation.required"),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "validation.nameMin").max(100, "validation.nameMax"),
    email: z.string().email("validation.invalidEmail"),
    password: passwordField,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "validation.passwordsMismatch",
    path: ["confirm_password"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("validation.invalidEmail"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "validation.passwordsMismatch",
    path: ["confirm_password"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
