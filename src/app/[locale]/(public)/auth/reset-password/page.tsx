import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ResetPasswordForm } from "@/components/sections/auth/ResetPasswordForm";

export const revalidate = 86400;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("resetPassword") };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResetPasswordForm />;
}
