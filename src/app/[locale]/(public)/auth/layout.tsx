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
        <div className="relative flex w-full flex-col justify-end overflow-hidden rounded-3xl shadow-[0px_0px_4px_0px_#e9f5fe]">
          <Image
            src="/images/auth/auth-bg.png"
            alt=""
            fill
            priority
            className="size-full -scale-x-100 object-cover"
            sizes="50vw"
          />
          {/* Blue radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(169,215,255,0.4)_0%,rgba(87,148,212,0.4)_50%,rgba(6,81,168,0.4)_100%)]" />
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          <div className="relative z-10 space-y-3 p-14">
            <h2 className="font-display text-4xl leading-12 tracking-[0.32px] text-white">
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
