"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function PasswordResetSuccessContent() {
  const t = useTranslations("auth");

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

      {/* Content */}
      <div className="space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-7 w-7 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2 text-center">
          <h1 className="font-display text-xl font-semibold tracking-tight text-[#242424]">
            {t("passwordResetSuccess")}
          </h1>
          <p className="text-sm leading-5.5 whitespace-pre-line text-[#6d6d6d]">
            {t("passwordResetSuccessDescription")}
          </p>
        </div>

        {/* Action */}
        <Link
          href="/auth/login"
          className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white shadow-xs transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
        >
          {t("backToSignIn")}
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
