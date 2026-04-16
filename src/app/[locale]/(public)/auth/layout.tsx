import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InviteTokenHandler } from "@/components/sections/auth";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen">
      {/* Left panel — background image with text overlay */}
      <div className="relative hidden w-1/2 shrink-0 p-6 lg:flex">
        <div className="relative flex w-full flex-col justify-end overflow-hidden rounded-[20px]">
          <Image
            src="/images/auth/login-bg.png"
            alt=""
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="relative z-10 space-y-3 p-[62px]">
            <h2 className="font-display text-[32px] leading-[48px] tracking-[0.32px] text-white">
              {t("brandTagline")}
            </h2>
            <p className="text-base leading-6 tracking-[0.16px] text-white/90">
              {t("brandSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form content */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[523px]">
          <InviteTokenHandler>{children}</InviteTokenHandler>
        </div>
      </div>
    </div>
  );
}
