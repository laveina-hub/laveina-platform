"use client";

import { ArrowRight, Mail } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { CheckIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";

export function AccountCreatedContent() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const isConfirmed = searchParams.get("confirmed") === "true";

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
          {isConfirmed ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckIcon size={28} color="#10b981" />
              </div>
            </div>
          ) : (
            <div className="bg-primary-50 flex h-20 w-20 items-center justify-center rounded-full">
              <div className="bg-primary-100 flex h-14 w-14 items-center justify-center rounded-full">
                <Mail className="text-primary-500 h-7 w-7" />
              </div>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2 text-center">
          <h1 className="font-display text-xl font-semibold tracking-tight text-[#242424]">
            {t(isConfirmed ? "accountVerified" : "accountCreated")}
          </h1>
          <p className="text-sm leading-5.5 whitespace-pre-line text-[#6d6d6d]">
            {t(isConfirmed ? "accountVerifiedDescription" : "accountCreatedDescription")}
          </p>
        </div>

        {/* Action */}
        {isConfirmed ? (
          <Link
            href="/auth/login"
            className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white shadow-xs transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
          >
            {t("backToSignIn")}
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <p className="text-center text-sm text-[#6d6d6d]">
            {t("didntReceiveEmail")}{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-[#1ec0ff] transition-colors hover:text-[#0192ff]"
            >
              {t("tryAgain")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
