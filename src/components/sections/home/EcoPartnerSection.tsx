import Image from "next/image";
import { useTranslations } from "next-intl";

import { ButtonLink, Heading, Text } from "@/components/atoms";
import { CheckIcon } from "@/components/icons";
import { FeatureListItem } from "@/components/molecules";

export function EcoPartnerSection() {
  const t = useTranslations("ecoPartner");

  const features: string[] = [t("feature1"), t("feature2"), t("feature3"), t("feature4")];

  return (
    <section className="overflow-hidden">
      <div className="flex flex-col md:flex-row md:pt-20 lg:pt-40">
        <div className="relative w-full md:w-1/2">
          <Image
            src="/images/eco-partner/eco-partner-handshake.png"
            alt={t("imageAlt")}
            width={720}
            height={600}
            className="h-auto w-full object-cover object-center md:h-full md:min-h-96"
          />
        </div>

        <div className="flex w-full flex-col justify-center px-6 py-10 md:w-1/2 md:px-12 md:py-14 lg:py-20 2xl:pl-40">
          <div className="mb-4">
            <Heading variant="section" className="xl:text-12xl">
              {t("title")}
            </Heading>
            <div className="bg-success-500 mt-2 h-1 w-20 xl:w-36" />
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
      </div>
    </section>
  );
}
