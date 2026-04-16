import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { WhyChoosePageSection } from "@/components/sections/why-choose";

export const revalidate = 86400;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("whyChoose") };
}

export default async function WhyChoosePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WhyChoosePageSection />;
}
