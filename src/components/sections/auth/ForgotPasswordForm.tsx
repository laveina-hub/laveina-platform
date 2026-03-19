"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, Input, Label, Text } from "@/components/atoms";
import { CheckIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validations/auth.schema";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setSubmitting(true);
    try {
      const callbackUrl = `${window.location.origin}/${locale}/auth/callback?next=/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: callbackUrl,
      });

      if (error) {
        toast.error(t("genericError"));
        return;
      }

      setEmailSent(true);
    } catch {
      toast.error(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-8">
        {/* Mobile logo */}
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

        <div className="text-center">
          <div className="bg-primary-100 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <CheckIcon size={28} color="var(--color-primary-500)" />
          </div>
          <h1 className="font-display text-text-primary text-2xl font-bold">{t("checkEmail")}</h1>
          <Text variant="body" className="mt-3">
            {t("checkEmailDescription")}
          </Text>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="text-primary-500 hover:text-primary-600 text-sm font-semibold transition-colors"
            >
              {t("backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
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

      {/* Header */}
      <div>
        <h1 className="font-display text-text-primary text-2xl font-bold sm:text-3xl">
          {t("forgotPasswordTitle")}
        </h1>
        <p className="text-text-muted mt-2 text-base">{t("forgotPasswordSubtitle")}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            hasError={!!errors.email}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email?.message && (
            <p id="email-error" role="alert" className="text-error text-sm">
              {tv(errors.email.message.replace("validation.", ""))}
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
              {t("sendResetLink")}
            </span>
          ) : (
            t("sendResetLink")
          )}
        </Button>

        <p className="text-text-muted text-center text-sm">
          <Link
            href="/auth/login"
            className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </form>
    </div>
  );
}
