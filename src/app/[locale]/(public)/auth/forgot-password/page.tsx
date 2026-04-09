import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/sections/auth/ForgotPasswordForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("forgotPassword") };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordForm />;
}
