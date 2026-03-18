"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, Input, Label, PasswordInput } from "@/components/atoms";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouter } from "@/i18n/navigation";
import { registerSchema, type RegisterInput } from "@/validations/auth.schema";

export function RegisterForm() {
  const t = useTranslations("auth");
  const { signUp } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
      const callbackUrl = `${window.location.origin}${window.location.pathname.replace("/register", "/callback")}`;
      const result = await signUp({
        email: data.email,
        password: data.password,
        fullName: data.full_name,
        phone: data.phone || undefined,
        emailRedirectTo: callbackUrl,
      });

      if (result.user?.identities?.length === 0) {
        toast.error(t("emailAlreadyExists"));
        return;
      }

      toast.success(t("accountCreated"), {
        description: t("accountCreatedDescription"),
      });
      router.push("/auth/login");
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
          {t("registerTitle")}
        </h1>
        <p className="text-text-muted mt-2 text-base">{t("registerSubtitle")}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Full Name */}
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
          {errors.full_name && (
            <p id="name-error" role="alert" className="text-error text-sm">
              {errors.full_name.message}
            </p>
          )}
        </div>

        {/* Email */}
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
          {errors.email && (
            <p id="email-error" role="alert" className="text-error text-sm">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
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

        {/* Submit */}
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

        {/* Switch to login */}
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
