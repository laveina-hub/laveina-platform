"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { ChevronIcon } from "@/components/icons";
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
        {/* Text */}
        <div className="space-y-2 text-center">
          <h1 className="font-display text-text-primary text-xl font-semibold tracking-tight">
            {t("passwordResetSuccess")}
          </h1>
          <p className="text-text-muted text-sm leading-5.5 whitespace-pre-line">
            {t("passwordResetSuccessDescription")}
          </p>
        </div>

        {/* Action */}
        <Link
          href="/auth/login"
          className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white shadow-xs transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
        >
          {t("backToSignIn")}
          <ChevronIcon direction="right" className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
