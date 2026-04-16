import Image from "next/image";
import { useTranslations } from "next-intl";

import { ButtonLink, Heading, Text } from "@/components/atoms";
import { RevealOnScroll } from "@/components/atoms/RevealOnScroll";
import { CheckIcon } from "@/components/icons";
import { FeatureListItem } from "@/components/molecules";
import { BLUR_DATA_URL } from "@/constants/image-blur";

export function EcoPartnerSection() {
  const t = useTranslations("ecoPartner");

  const features: string[] = [t("feature1"), t("feature2"), t("feature3"), t("feature4")];

  return (
    <section className="overflow-hidden">
      <RevealOnScroll className="flex flex-col pt-16 md:flex-row lg:pt-24">
        <div className="relative w-full md:w-1/2">
          <Image
            src="/images/eco-partner/eco-partner-handshake.png"
            alt={t("imageAlt")}
            width={720}
            height={600}
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="h-auto w-full object-cover object-center md:h-full md:min-h-96"
          />
        </div>

        <div className="flex w-full flex-col justify-center px-6 py-10 md:w-1/2 md:px-12 md:py-14 lg:py-20 2xl:pl-40">
          <div className="mb-4">
            <Heading variant="section">{t("title")}</Heading>
            <div className="bg-success mt-2 h-1 w-20 xl:w-36" />
          </div>

          <Text variant="subtitleSm" as="h3" className="mb-4">
            {t("subtitle")}
          </Text>

          <Text variant="body" className="mb-6 max-w-lg 2xl:text-xl">
            {t("description")}
          </Text>

          <ul className="mb-8 space-y-3">
            {features.map((feature, i) => (
              <FeatureListItem key={i} icon={<CheckIcon size={10} color="blue" />}>
                {feature}
              </FeatureListItem>
            ))}
          </ul>

          <div>
            <ButtonLink href="/eco-partner" variant="primary" size="xl">
              {t("cta")}
            </ButtonLink>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
