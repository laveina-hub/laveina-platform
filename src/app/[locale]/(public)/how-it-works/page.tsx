import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  BusinessSection,
  ComparisonSection,
  HowItWorksCtaSection,
  HowItWorksHeroSection,
  IndividualsSection,
} from "@/components/sections/how-it-works";

export const revalidate = 3600;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("howItWorks") };
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HowItWorksHeroSection />
      <IndividualsSection />
      <BusinessSection />
      <ComparisonSection />
      <HowItWorksCtaSection />
    </>
  );
}
