"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { registerAction } from "@/actions/auth";
import { Button, Divider, Input, Label, PasswordInput } from "@/components/atoms";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouter } from "@/i18n/navigation";
import { registerSchema, type RegisterInput } from "@/validations/auth.schema";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Q13.6 — when arriving from the delivery-confirmation soft-register prompt,
  // the receiver's email rides along as `?email=` so we can pre-fill the form.
  const searchParams = useSearchParams();
  const presetEmail = searchParams.get("email") ?? undefined;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: presetEmail ? { email: presetEmail } : undefined,
  });

  async function onSubmit(data: RegisterInput) {
    setSubmitting(true);
    try {
      const result = await registerAction(data.email, data.password, data.full_name, locale);

      if (result.error === "emailAlreadyExists") {
        setError("email", { type: "server", message: "validation.emailAlreadyExists" });
        setSubmitting(false);
        return;
      }

      if (result.error) {
        toast.error(t("genericError"));
        setSubmitting(false);
        return;
      }

      router.push("/auth/account-created");
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

      <div className="space-y-10">
        {/* Heading */}
        <div className="space-y-0.5">
          <h1 className="font-display text-text-primary text-2xl font-semibold tracking-tight">
            {t("registerTitle")}
          </h1>
          <p className="text-text-muted text-lg leading-7">{t("registerSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="full_name" className="text-text-light pl-0.5 font-semibold">
                {t("fullName")}
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder={t("fullNamePlaceholder")}
                autoComplete="name"
                hasError={!!errors.full_name}
                aria-invalid={!!errors.full_name}
                aria-describedby={errors.full_name ? "name-error" : undefined}
                className="border-border-default rounded-lg px-4 py-3"
                {...register("full_name")}
              />
              {errors.full_name?.message && (
                <p id="name-error" role="alert" className="text-error animate-error-in text-sm">
                  {tv(errors.full_name.message.replace("validation.", ""))}
                </p>
              )}
            </div>

            {/* Email */}
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

            {/* Enter Password */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-text-light pl-0.5 font-semibold">
                {t("enterPassword")}
              </Label>
              <PasswordInput
                id="password"
                placeholder={t("passwordPlaceholder")}
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

            {/* Confirm Password */}
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

          {/* Actions */}
          <div className="space-y-5">
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
                  {t("createAccount")}
                </span>
              ) : (
                t("createAccount")
              )}
            </Button>

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <Divider className="border-border-default flex-1 border-t" />
              <span className="text-text-muted text-xs">{t("orDivider")}</span>
              <Divider className="border-border-default flex-1 border-t" />
            </div>

            <p className="text-center text-sm">
              <span className="text-text-primary">{t("hasAccount")}</span>{" "}
              <Link
                href="/auth/login"
                className="text-primary-400 hover:text-secondary-500 font-semibold transition-colors"
              >
                {t("signInLink")}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
