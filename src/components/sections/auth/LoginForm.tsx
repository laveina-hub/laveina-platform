"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, Input, Label, PasswordInput } from "@/components/atoms";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/validations/auth.schema";

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin",
  pickup_point: "/pickup-point",
  customer: "/customer",
};

export function LoginForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setSubmitting(true);
    try {
      await signIn(data.email, data.password);

      // Prevent open-redirect: only allow internal paths
      const raw = searchParams.get("redirect");
      const hasValidRedirect = raw && raw.startsWith("/") && !raw.startsWith("//");

      let redirectTo: string;
      if (hasValidRedirect) {
        redirectTo = raw;
      } else {
        const supabase = createClient();
        const { data: role } = await supabase.rpc("get_user_role");
        // SAFETY: get_user_role() RPC returns a text value from the profiles table enum
        redirectTo = ROLE_DASHBOARD[(role as string) ?? "customer"] ?? "/customer";
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error(t("invalidCredentials"));
    } finally {
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
          {t("loginTitle")}
        </h1>
        <p className="text-text-muted mt-2 text-base">{t("loginSubtitle")}</p>
      </div>

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link
              href="/auth/forgot-password"
              className="text-primary-500 hover:text-primary-600 text-sm font-medium transition-colors"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder={t("passwordPlaceholder")}
            autoComplete="current-password"
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
              {t("signIn")}
            </span>
          ) : (
            t("signIn")
          )}
        </Button>

        <p className="text-text-muted text-center text-sm">
          {t("noAccount")}{" "}
          <Link
            href="/auth/register"
            className="text-primary-500 hover:text-primary-600 font-semibold transition-colors"
          >
            {t("signUpLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
