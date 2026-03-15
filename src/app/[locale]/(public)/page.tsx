import { setRequestLocale } from "next-intl/server";

import { CtaSection } from "@/components/sections/CtaSection";
import { EcoPartnerSection } from "@/components/sections/EcoPartnerSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { PickupPointsNetworkSection } from "@/components/sections/PickupPointsNetworkSection";
import { PricingSection } from "@/components/sections/pricing-section";
import { WhyChooseUsSection } from "@/components/sections/WhyChooseUsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

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
