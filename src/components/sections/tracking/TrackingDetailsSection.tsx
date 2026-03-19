"use client";

import { useTranslations } from "next-intl";

import { CardHeader, CardShell, Text } from "@/components/atoms";

interface TrackingDetailsSectionProps {
  trackingId: string;
  bookingDate?: string;
  originName?: string;
  destinationName?: string;
  status?: string;
  carrierName?: string | null;
  carrierTrackingNumber?: string | null;
}

export function TrackingDetailsSection({
  trackingId,
  bookingDate,
  originName,
  destinationName,
  status,
  carrierName,
  carrierTrackingNumber,
}: TrackingDetailsSectionProps) {
  const t = useTranslations("tracking");
  const tStatus = useTranslations("tracking.status");

  const formattedDate = bookingDate
    ? new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(bookingDate))
    : "—";

  const fields = [
    { label: t("orderId"), value: trackingId },
    { label: t("bookingDate"), value: formattedDate },
    { label: t("from"), value: originName ?? "—" },
    { label: t("to"), value: destinationName ?? "—" },
  ];

  return (
    <CardShell>
      <CardHeader title={t("trackingIdLabel", { trackingId })} />

      <div className="flex flex-col gap-4 px-7 py-9 md:gap-1.5 md:px-8 md:pt-7 md:pb-9 lg:flex-row lg:items-end">
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-1.5">
          {fields.map((field) => (
            <div key={field.label}>
              <Text as="label" className="mb-2.5 block text-base md:text-xl">
                {field.label}
              </Text>
              <div className="border-border-default font-body text-text-muted flex items-center rounded-lg border px-6 py-4 text-base leading-none md:text-xl lg:py-6">
                {field.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          {status && (
            <div className="font-body bg-primary-50 text-primary-700 flex h-fit items-center rounded-lg px-4 py-3 text-base font-medium md:text-xl lg:py-5">
              {tStatus(status)}
            </div>
          )}
        </div>
      </div>

      {/* Carrier tracking info for SendCloud shipments */}
      {carrierName && carrierTrackingNumber && (
        <div className="border-border-muted border-t px-7 py-5 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-body text-text-muted text-base">{t("carrier")}:</span>
            <span className="font-body text-text-primary text-base font-medium">{carrierName}</span>
            <span className="font-body text-text-muted text-base">—</span>
            <span className="font-body text-text-primary text-base font-medium">
              {carrierTrackingNumber}
            </span>
          </div>
        </div>
      )}
    </CardShell>
  );
}
