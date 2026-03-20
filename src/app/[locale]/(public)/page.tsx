import { setRequestLocale } from "next-intl/server";

// Homepage content is mostly static — revalidate every hour
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
