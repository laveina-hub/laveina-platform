import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getRecoveryEmail } from "@/actions/auth";
import { VerifyOtpForm } from "@/components/sections/auth";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("otpVerifyTitle") };
}

export default async function VerifyOtpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const email = await getRecoveryEmail();

  return <VerifyOtpForm email={email} />;
}
