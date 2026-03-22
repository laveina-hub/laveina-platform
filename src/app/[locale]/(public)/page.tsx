import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const revalidate = 3600;

import {
  CtaSection,
  EcoPartnerSection,
  HeroSection,
  PickupPointsNetworkSection,
  PricingSection,
  WhyChooseUsSection,
} from "@/components/sections/home";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <PricingSection />
      <EcoPartnerSection />
      <WhyChooseUsSection />
      <PickupPointsNetworkSection />
      <CtaSection />
    </>
  );
}
