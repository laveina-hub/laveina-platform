"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { loginAction } from "@/actions/auth";
import { Button, Divider, Input, Label, PasswordInput } from "@/components/atoms";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/validations/auth.schema";

export function LoginForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function handleGoogleSignIn() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
    if (error) {
      toast.error(t("genericError"));
    }
  }

  async function onSubmit(data: LoginInput) {
    setSubmitting(true);
    try {
      const result = await loginAction(
        data.email,
        data.password,
        locale,
        searchParams.get("redirect")
      );

      toast.error(t(result.error));
      setSubmitting(false);
    } catch (error: unknown) {
      // Re-throw NEXT_REDIRECT
      if (error && typeof error === "object" && "digest" in error) throw error;

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
            {t("loginTitle")}
          </h1>
          <p className="text-text-muted text-lg leading-7">{t("loginSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <div className="space-y-6">
            {/* Email field */}
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

            {/* Password field */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-text-light pl-0.5 font-semibold">
                {t("password")}
              </Label>
              <PasswordInput
                id="password"
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
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
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-text-muted hover:text-text-light text-sm font-semibold transition-colors"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-5">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full gap-2 rounded-xl"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t("signIn")}
                </span>
              ) : (
                <>
                  {t("signIn")}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            {/* OR divider */}
            <div className="flex items-center gap-4">
              <Divider className="border-border-default flex-1 border-t" />
              <span className="text-text-muted text-xs">{t("orDivider")}</span>
              <Divider className="border-border-default flex-1 border-t" />
            </div>

            {/* Google sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="border-border-default flex h-12 w-full items-center justify-center gap-2 rounded-lg border transition-colors hover:bg-gray-50"
            >
              <Image src="/images/auth/google-icon.svg" alt="" width={20} height={20} unoptimized />
              <span className="text-sm font-medium text-black">{t("signInWithGoogle")}</span>
            </button>

            <p className="text-center text-sm">
              <span className="text-text-primary">{t("noAccount")}</span>{" "}
              <Link
                href="/auth/register"
                className="text-primary-400 hover:text-secondary-500 font-semibold transition-colors"
              >
                {t("signUpLink")}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
