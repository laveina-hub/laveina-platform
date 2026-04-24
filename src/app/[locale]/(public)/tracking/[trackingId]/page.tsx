import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/components/atoms";
import { RealtimeTrackingSection } from "@/components/sections/tracking";
import { getPublicTrackingData } from "@/services/shipment.service";

// Public, no auth. force-dynamic so scan updates don't hit a stale CDN.
export const dynamic = "force-dynamic";

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

  const result = await getPublicTrackingData(trackingId);

  if (result.error || !result.data) {
    return (
      <SectionContainer className="py-24 text-center">
        <p className="text-text-muted text-lg">{t("shipmentNotFound")}</p>
      </SectionContainer>
    );
  }

  return <RealtimeTrackingSection data={result.data} />;
}
