"use client";

import { useTranslations } from "next-intl";

import { ButtonLink, Heading, SectionContainer, Text } from "@/components/atoms";

export function HowItWorksCtaSection() {
  const t = useTranslations("howItWorks");

  return (
    <section className="bg-secondary-700 py-20 md:py-24">
      <SectionContainer className="text-center">
        <Heading variant="display" as="h2" className="mb-10">
          {t("ctaTitle")}
        </Heading>

        <div className="mx-auto flex max-w-xl flex-col gap-4 sm:flex-row sm:justify-center">
          <ButtonLink href="/book" variant="primary" size="xl">
            {t("ctaIndividualsButton")}
          </ButtonLink>
          <ButtonLink
            href="/contact"
            variant="outline"
            size="xl"
            className="border-white bg-transparent text-white hover:bg-white/10"
          >
            {t("ctaBusinessButton")}
          </ButtonLink>
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-1 sm:flex-row sm:justify-center sm:gap-6">
          <Text variant="body" className="text-sm text-white/70">
            {t("ctaIndividuals")}
          </Text>
          <Text variant="body" className="text-sm text-white/70">
            {t("ctaBusiness")}
          </Text>
        </div>
      </SectionContainer>
    </section>
  );
}
