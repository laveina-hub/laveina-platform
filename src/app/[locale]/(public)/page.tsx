import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CtaSection } from "@/components/sections/home/CtaSection";
import { EcoPartnerSection } from "@/components/sections/home/EcoPartnerSection";
import { HeroSection } from "@/components/sections/home/HeroSection";
import { PickupPointsNetworkSection } from "@/components/sections/home/PickupPointsNetworkSection";
import { PricingSection } from "@/components/sections/home/PricingSection";
import { WhyChooseUsSection } from "@/components/sections/home/WhyChooseUsSection";

export const revalidate = 86400;

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
