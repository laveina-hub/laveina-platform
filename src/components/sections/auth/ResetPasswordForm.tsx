"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updatePasswordAction } from "@/actions/auth";
import { Button, Label, PasswordInput } from "@/components/atoms";
import { getLocalePrefix, ROLE_DASHBOARD } from "@/constants/app";
import { useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validations/auth.schema";

type Props = {
  /** "reset" = returning user resetting password, "set" = invited owner setting first password */
  mode?: "reset" | "set";
};

export function ResetPasswordForm({ mode = "reset" }: Props) {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const isSetMode = mode === "set";
  const titleKey = isSetMode ? "setPasswordTitle" : "resetPasswordTitle";
  const subtitleKey = isSetMode ? "setPasswordSubtitle" : "resetPasswordSubtitle";
  const buttonKey = isSetMode ? "setPassword" : "updatePassword";

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
      const result = await updatePasswordAction(data.password, mode);

      if (result.error) {
        toast.error(t("genericError"));
        setSubmitting(false);
        return;
      }

      if (isSetMode) {
        // For set-password (invited users), redirect to dashboard
        toast.success(t("passwordSet"), {
          description: t("passwordSetDescription"),
        });
        const role = result.role ?? "pickup_point";
        const path =
          ROLE_DASHBOARD[role] ?? `/${role === "pickup_point" ? "pickup-point" : "customer"}`;
        const prefix = getLocalePrefix(locale, routing.defaultLocale);
        window.location.href = `${prefix}${path}`;
      } else {
        // For password reset, sign-out already happened server-side
        router.push("/auth/password-reset-success");
      }
    } catch {
      toast.error(t("genericError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* Logo */}
      <Image
        src="/images/header/logo-laveina.svg"
        alt={t("logoAlt")}
        width={180}
        height={52}
        priority
        unoptimized
        className="h-13 w-auto"
      />

      <div className="space-y-10">
        {/* Heading */}
        <div className="space-y-0.5">
          <h1 className="font-display text-text-primary text-2xl font-semibold tracking-tight">
            {t(titleKey)}
          </h1>
          <p className="text-text-muted text-lg leading-7">{t(subtitleKey)}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <div className="space-y-6">
            <div className="space-y-1">
              <Label htmlFor="password" className="text-text-light pl-0.5 font-semibold">
                {t("newPassword")}
              </Label>
              <PasswordInput
                id="password"
                placeholder={t("newPasswordPlaceholder")}
                autoComplete="new-password"
                hasError={!!errors.password}
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="rounded-lg px-4 py-3"
                {...register("password")}
              />
              {errors.password?.message && (
                <p id="password-error" role="alert" className="text-error animate-error-in text-sm">
                  {tv(errors.password.message.replace("validation.", ""))}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm_password" className="text-text-light pl-0.5 font-semibold">
                {t("confirmPassword")}
              </Label>
              <PasswordInput
                id="confirm_password"
                placeholder={t("confirmPasswordPlaceholder")}
                autoComplete="new-password"
                hasError={!!errors.confirm_password}
                showPasswordLabel={t("showPassword")}
                hidePasswordLabel={t("hidePassword")}
                aria-invalid={!!errors.confirm_password}
                aria-describedby={errors.confirm_password ? "confirm-password-error" : undefined}
                className="rounded-lg px-4 py-3"
                {...register("confirm_password")}
              />
              {errors.confirm_password?.message && (
                <p
                  id="confirm-password-error"
                  role="alert"
                  className="text-error animate-error-in text-sm"
                >
                  {tv(errors.confirm_password.message.replace("validation.", ""))}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-xl"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t(buttonKey)}
              </span>
            ) : (
              t(buttonKey)
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
