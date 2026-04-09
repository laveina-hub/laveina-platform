"use client";

import { useTranslations } from "next-intl";

import { Heading, SectionContainer, Text } from "@/components/atoms";

export function HowItWorksHeroSection() {
  const t = useTranslations("howItWorks");

  return (
    <section className="bg-primary py-20 md:py-28">
      <SectionContainer className="text-center">
        <Heading variant="display" as="h1" className="mb-6">
          {t("heroTitle")}
        </Heading>

        <Text
          variant="bodyLight"
          as="p"
          className="mx-auto max-w-2xl text-lg leading-relaxed text-white/90 xl:text-xl"
        >
          {t("heroDescription")}
        </Text>
      </SectionContainer>
    </section>
  );
}
