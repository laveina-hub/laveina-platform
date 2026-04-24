"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { sendPasswordResetOtp } from "@/actions/auth";
import { Button, Input, Label } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouter } from "@/i18n/navigation";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validations/auth.schema";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

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
      const result = await sendPasswordResetOtp(data.email);

      if (result.error) {
        toast.error(t("genericError"));
        setSubmitting(false);
        return;
      }

      router.push("/auth/verify-otp");
    } catch {
      toast.error(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <span className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
        <p className="text-text-muted text-base">{t("redirecting")}</p>
      </div>
    );
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

      <div className="space-y-6">
        {/* Heading with back arrow */}
        <div className="flex items-center gap-3">
          <Link href="/auth/login" aria-label={t("backToLogin")}>
            <ChevronIcon className="text-text-primary h-7 w-7" />
          </Link>
          <h1 className="font-display text-text-primary text-3xl leading-10.5 font-semibold tracking-tight">
            {t("forgotPasswordTitle")}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-text-light pl-0.5 font-semibold">
              {t("email")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              hasError={!!errors.email}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="border-border-default rounded-lg px-4 py-3"
              {...register("email")}
            />
            {errors.email?.message && (
              <p id="email-error" role="alert" className="text-error animate-error-in text-sm">
                {tv(errors.email.message.replace("validation.", ""))}
              </p>
            )}
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
                {t("sendVerificationCode")}
              </span>
            ) : (
              t("sendVerificationCode")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
