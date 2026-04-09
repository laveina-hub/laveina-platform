import Image from "next/image";
import { useTranslations } from "next-intl";

import { ButtonLink, Heading, SectionContainer, Text } from "@/components/atoms";

export function CtaSection() {
  const t = useTranslations("cta");

  return (
    <section className="from-primary-100 to-primary-50 overflow-hidden bg-gradient-to-br">
      <SectionContainer className="py-12 lg:py-16">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-0">
          <div className="flex flex-col items-start text-left md:w-1/2 md:pr-8 lg:pr-12">
            <Heading variant="section" className="mb-4">
              {t("titleLine1")}
              <br />
              {t("titleLine2")}
            </Heading>

            <Text variant="subtitle" className="mb-8 max-w-xl text-lg xl:text-2xl">
              {t("description")}
            </Text>

            <div className="flex flex-wrap justify-start gap-3">
              <ButtonLink href="/book" variant="primary" size="lg" className="text-sm lg:text-lg">
                {t("ctaPrimary")}
              </ButtonLink>

              <ButtonLink
                href="/contact"
                variant="outline"
                size="lg"
                className="text-sm md:text-lg"
              >
                {t("ctaSecondary")}
              </ButtonLink>
            </div>
          </div>

          <div className="w-full md:w-1/2">
            <Image
              src="/images/cta/cta-vehicles.png"
              alt={t("imageAlt")}
              width={640}
              height={420}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full object-contain"
            />
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
