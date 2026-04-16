import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { Heading, SectionContainer } from "@/components/atoms";
import {
  TrackingSearchSection,
  TrackingDetailsSection,
  ShipmentProgressSection,
  ContactSupportSection,
} from "@/components/sections/tracking";
import { getPublicTrackingData } from "@/services/shipment.service";

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

  return (
    <div className="bg-primary-50">
      <SectionContainer className="space-y-8 pt-14 pb-24 sm:space-y-16 sm:py-18 sm:pb-30 lg:py-24">
        <Heading variant="page" as="h1" className="">
          {t("title")}
        </Heading>

        <div className="flex flex-col gap-6">
          <TrackingSearchSection />

          {result.error ? (
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <p className="font-body text-text-muted text-center text-lg">
                {t("shipmentNotFound")}
              </p>
            </div>
          ) : (
            <>
              <TrackingDetailsSection
                trackingId={result.data.tracking_id}
                bookingDate={result.data.created_at}
                originName={result.data.origin_pickup_point?.name}
                destinationName={result.data.destination_pickup_point?.name}
                status={result.data.status}
                carrierName={result.data.carrier_name}
                carrierTrackingNumber={result.data.carrier_tracking_number}
              />
              <ShipmentProgressSection
                scanLogs={result.data.scan_logs}
                status={result.data.status}
              />
              <ContactSupportSection />
            </>
          )}
        </div>
      </SectionContainer>
    </div>
  );
}
