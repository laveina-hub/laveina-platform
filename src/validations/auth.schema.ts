import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("validation.invalidEmail"),
  password: z.string().min(8, "validation.passwordMin"),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "validation.nameMin"),
    email: z.string().email("validation.invalidEmail"),
    password: z.string().min(8, "validation.passwordMin"),
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
    password: z.string().min(8, "validation.passwordMin"),
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
