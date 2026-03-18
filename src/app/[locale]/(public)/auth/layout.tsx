import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CheckIcon } from "@/components/icons";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-[calc(100vh-200px)]">
      {/* Left side — Branding panel (hidden on mobile) */}
      <div className="from-primary-600 via-primary-500 to-secondary-500 relative hidden w-120 shrink-0 flex-col justify-between overflow-hidden bg-linear-to-br p-10 lg:flex xl:w-135">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -right-16 -bottom-16 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 h-40 w-40 -translate-y-1/2 rounded-full bg-white/5" />

        {/* Logo */}
        <div>
          <Image
            src="/images/header/logo-laveina.svg"
            alt="Laveina"
            width={148}
            height={43}
            priority
            unoptimized
            className="h-12 w-auto brightness-0 invert"
          />
        </div>

        {/* Tagline + features */}
        <div className="relative z-10 space-y-8">
          <h2 className="font-display text-3xl leading-tight text-white xl:text-4xl">
            {t("brandTagline")}
          </h2>
          <ul className="space-y-4">
            {(["brandFeature1", "brandFeature2", "brandFeature3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckIcon size={14} color="white" />
                </span>
                <span className="text-base text-white/90">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom spacer */}
        <div />
      </div>

      {/* Right side — Form area */}
      <div className="bg-bg-secondary flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
