import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RegisterForm } from "@/components/sections/auth/RegisterForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("register") };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RegisterForm />;
}
