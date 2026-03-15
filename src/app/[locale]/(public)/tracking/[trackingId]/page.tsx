import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import {
  TrackingSearchSection,
  TrackingDetailsSection,
  ShipmentProgressSection,
  ContactSupportSection,
} from "@/components/tracking";

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
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <h1 className="text-primary-500 mb-8 text-4xl font-medium md:text-8xl">{t("title")}</h1>

        <div className="flex flex-col gap-6">
          <TrackingSearchSection />
          <TrackingDetailsSection trackingId={trackingId} />
          <ShipmentProgressSection currentStep={2} />
          <ContactSupportSection />
        </div>
      </div>
    </div>
  );
}
