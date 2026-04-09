"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter as useNextRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, Label, PasswordInput } from "@/components/atoms";
import { getLocalePrefix, ROLE_DASHBOARD } from "@/constants/app";
import { useAuth } from "@/hooks/use-auth";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validations/auth.schema";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const { user } = useAuth();
  const nextRouter = useNextRouter();
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
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
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(t("genericError"));
        setSubmitting(false);
        return;
      }

      toast.success(t("passwordUpdated"), {
        description: t("passwordUpdatedDescription"),
      });
      // SAFETY: user_metadata values are untyped
      const role = (user?.user_metadata?.role as string) ?? "customer";
      const path = ROLE_DASHBOARD[role] ?? "/customer";
      const prefix = getLocalePrefix(locale, routing.defaultLocale);
      nextRouter.replace(`${prefix}${path}`);
    } catch {
      toast.error(t("genericError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-center lg:hidden">
        <Image
          src="/images/header/logo-laveina.svg"
          alt={t("logoAlt")}
          width={148}
          height={43}
          priority
          unoptimized
          className="h-10 w-auto"
        />
      </div>

      <div>
        <h1 className="font-display text-text-primary text-2xl font-bold sm:text-3xl">
          {t("resetPasswordTitle")}
        </h1>
        <p className="text-text-muted mt-2 text-base">{t("resetPasswordSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
          {errors.password?.message && (
            <p id="password-error" role="alert" className="text-error text-sm">
              {tv(errors.password.message.replace("validation.", ""))}
            </p>
          )}
        </div>

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
          {errors.confirm_password?.message && (
            <p id="confirm-password-error" role="alert" className="text-error text-sm">
              {tv(errors.confirm_password.message.replace("validation.", ""))}
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
