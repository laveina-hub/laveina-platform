"use client";

import { useTranslations } from "next-intl";

import { QrScannerSection } from "@/components/sections/pickup-point";
import { usePickupPointId } from "@/hooks/use-pickup-point-id";

export function ScanPageClient() {
  const t = useTranslations("scanner");
  const { data: pickupPointId, isLoading } = usePickupPointId();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="font-body text-text-muted text-lg">{t("loading")}</p>
      </div>
    );
  }

  if (!pickupPointId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="font-body text-text-primary text-lg font-medium">{t("noPickupPoint")}</p>
          <p className="font-body text-text-muted mt-1 text-base">{t("noPickupPointDesc")}</p>
        </div>
      </div>
    );
  }

  return <QrScannerSection pickupPointId={pickupPointId} />;
}
