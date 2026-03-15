import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer, Text } from "@/components/atoms";
import {
  TrackingSearchSection,
  TrackingDetailsSection,
  ShipmentProgressSection,
  ContactSupportSection,
} from "@/components/sections/tracking";

type Props = {
  params: Promise<{ locale: string; trackingId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, trackingId } = await params;
  const t = await getTranslations({ locale, namespace: "tracking" });
  return { title: `${t("title")} — ${trackingId}` };
}

export default async function TrackingResultPage({ params }: Props) {
  const { locale, trackingId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tracking" });

  return (
    <div className="bg-primary-50">
      <SectionContainer className="space-y-8 pt-14 pb-24 sm:space-y-16 sm:py-18 sm:pb-30 lg:py-24">
        <Heading variant="page" as="h1" className="">
          {t("title")}
        </Heading>

        <div className="flex flex-col gap-6">
          <TrackingSearchSection />
          <TrackingDetailsSection trackingId={trackingId} />
          <ShipmentProgressSection currentStep={2} />
          <ContactSupportSection />
        </div>
      </SectionContainer>
    </div>
  );
}
