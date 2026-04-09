"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, Input, Label, PasswordInput, Text } from "@/components/atoms";
import { CheckIcon } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { registerSchema, type RegisterInput } from "@/validations/auth.schema";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const { user, signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setSubmitting(true);
    try {
      // Use the current locale for the callback URL instead of parsing pathname
      const callbackUrl = `${window.location.origin}/${locale}/auth/callback?next=/customer`;
      const result = await signUp({
        email: data.email,
        password: data.password,
        fullName: data.full_name,
        emailRedirectTo: callbackUrl,
      });

      if (result.user?.identities?.length === 0) {
        toast.error(t("emailAlreadyExists"));
        setSubmitting(false);
        return;
      }

      setEmailSent(true);
    } catch {
      toast.error(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (user && !emailSent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <span className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
        <p className="text-text-muted text-base">{t("redirecting")}</p>
      </div>
    );
  }

  if (emailSent) {
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

        <div className="text-center">
          <div className="bg-primary-100 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <CheckIcon size={28} color="var(--color-primary-500)" />
          </div>
          <h1 className="font-display text-text-primary text-2xl font-bold">{t("checkEmail")}</h1>
          <Text variant="body" className="mt-3">
            {t("accountCreatedDescription")}
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
          {t("registerTitle")}
        </h1>
        <p className="text-text-muted mt-2 text-base">{t("registerSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="full_name">{t("fullName")}</Label>
          <Input
            id="full_name"
            type="text"
            placeholder={t("fullNamePlaceholder")}
            autoComplete="name"
            hasError={!!errors.full_name}
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? "name-error" : undefined}
            {...register("full_name")}
          />
          {errors.full_name?.message && (
            <p id="name-error" role="alert" className="text-error text-sm">
              {tv(errors.full_name.message.replace("validation.", ""))}
            </p>
          )}
        </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <PasswordInput
            id="password"
            placeholder={t("passwordPlaceholder")}
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
              {t("signUp")}
            </span>
          ) : (
            t("signUp")
          )}
        </Button>

        <p className="text-text-muted text-center text-sm">
          {t("hasAccount")}{" "}
          <Link
            href="/auth/login"
            className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
          >
            {t("signInLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
