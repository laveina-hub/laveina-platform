import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer } from "@/components/atoms";
import { TrackingSearchSection } from "@/components/sections/tracking";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tracking" });
  return { title: t("title") };
}

export default async function TrackingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tracking" });

  return (
    <div className="bg-primary-50">
      <SectionContainer className="space-y-8 pt-14 pb-24 sm:space-y-16 sm:py-18 sm:pb-30 lg:py-24">
        <Heading variant="page" as="h1">
          {t("title")}
        </Heading>

        <TrackingSearchSection />
      </SectionContainer>
    </div>
  );
}
