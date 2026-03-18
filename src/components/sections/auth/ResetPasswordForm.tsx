"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Label, PasswordInput } from "@/components/atoms";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(t("genericError"));
        return;
      }

      toast.success(t("passwordUpdated"), {
        description: t("passwordUpdatedDescription"),
      });
      router.push("/");
      router.refresh();
    } catch {
      toast.error(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
      <div className="flex justify-center lg:hidden">
        <Image
          src="/images/header/logo-laveina.svg"
          alt="Laveina"
          width={148}
          height={43}
          priority
          unoptimized
          className="h-10 w-auto"
        />
      </div>

      {/* Header */}
      <div>
        <h1 className="font-display text-text-primary text-2xl font-bold sm:text-3xl">
          {t("resetPasswordTitle")}
        </h1>
        <p className="text-text-muted mt-2 text-base">{t("resetPasswordSubtitle")}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("newPassword")}</Label>
          <PasswordInput
            id="password"
            placeholder={t("newPasswordPlaceholder")}
            autoComplete="new-password"
            hasError={!!errors.password}
            showPasswordLabel={t("showPassword")}
            hidePasswordLabel={t("hidePassword")}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-error text-sm">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
          <PasswordInput
            id="confirm_password"
            placeholder={t("confirmPasswordPlaceholder")}
            autoComplete="new-password"
            hasError={!!errors.confirm_password}
            showPasswordLabel={t("showPassword")}
            hidePasswordLabel={t("hidePassword")}
            aria-invalid={!!errors.confirm_password}
            aria-describedby={errors.confirm_password ? "confirm-password-error" : undefined}
            {...register("confirm_password")}
          />
          {errors.confirm_password && (
            <p id="confirm-password-error" role="alert" className="text-error text-sm">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t("updatePassword")}
            </span>
          ) : (
            t("updatePassword")
          )}
        </Button>
      </form>
    </div>
  );
}
