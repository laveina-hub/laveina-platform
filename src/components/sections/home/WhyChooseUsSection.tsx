import Image from "next/image";
import { useTranslations } from "next-intl";

import { Heading, SectionContainer, Text } from "@/components/atoms";

export function WhyChooseUsSection() {
  const t = useTranslations("whyChooseUs");

  return (
    <section className="bg-white py-12 md:py-16 lg:py-20">
      <SectionContainer className="flex w-full justify-center">
        <div className="flex w-full flex-col items-center gap-2 xl:flex-row xl:items-center">
          <div className="w-full max-w-xl text-center xl:text-start">
            <Heading variant="section">
              {t("titleLine1")}
              <br />
              <span className="text-primary lg:text-12xl text-7xl">{t("titleLine2")}</span>
            </Heading>

            <Text variant="subtitle" className="mt-4 md:mt-6 xl:text-2xl">
              {t("description")}
            </Text>
          </div>

          <div className="mt-10 flex w-full flex-1">
            <Image
              src="/images/why-choose-us/why-choose-us-person.png"
              alt={t("imageAlt")}
              width={600}
              height={520}
              className="h-auto w-full max-w-5xl object-contain"
            />
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
