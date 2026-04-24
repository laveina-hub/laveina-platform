import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import { TrackingInfoSection, TrackingSearchSection } from "@/components/sections/tracking";

export const revalidate = 86400;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tracking" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function TrackingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tracking" });

  return (
    <div className="bg-secondary-100">
      <section className="px-4 pt-16 pb-12 sm:px-6 md:pt-24 md:pb-16 lg:px-10">
        <SectionContainer>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <Heading variant="page" as="h1">
              {t("title")}
            </Heading>
            <div className="bg-tertiary-50 mx-auto mt-4 h-1 w-16 rounded-full" />
            <Text variant="subtitle" className="text-text-light mt-6">
              {t("subtitle")}
            </Text>
          </div>

          <TrackingSearchSection />
        </SectionContainer>
      </section>

      <TrackingInfoSection />
    </div>
  );
}
