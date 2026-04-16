import Image from "next/image";
import { useTranslations } from "next-intl";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import { RevealOnScroll } from "@/components/atoms/RevealOnScroll";
import { BLUR_DATA_URL } from "@/constants/image-blur";

export function WhyChooseUsSection() {
  const t = useTranslations("whyChooseUs");

  return (
    <section className="bg-white py-16 lg:py-24">
      <SectionContainer className="flex w-full justify-center">
        <RevealOnScroll className="flex w-full flex-col items-center gap-2 lg:flex-row lg:items-center">
          <div className="w-full text-center lg:max-w-md lg:text-start xl:max-w-xl">
            <Heading variant="section">
              {t("titleLine1")}
              <br />
              <span className="font-display text-primary xl:text-12xl text-6xl font-bold">
                {t("titleLine2")}
              </span>
            </Heading>

            <Text variant="subtitle" className="mt-4 md:mt-6">
              {t("description")}
            </Text>
          </div>

          <div className="mt-10 flex w-full flex-1">
            <Image
              src="/images/why-choose-us/why-choose-us-person.png"
              alt={t("imageAlt")}
              width={600}
              height={520}
              sizes="(max-width: 1024px) 100vw, 60vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="h-auto w-full max-w-5xl object-contain"
            />
          </div>
        </RevealOnScroll>
      </SectionContainer>
    </section>
  );
}
