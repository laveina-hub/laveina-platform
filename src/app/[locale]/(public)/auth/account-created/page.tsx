import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountCreatedContent } from "@/components/sections/auth/AccountCreatedContent";

export const revalidate = 86400;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("accountCreated") };
}

export default async function AccountCreatedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AccountCreatedContent />;
}
