import { useTranslations } from "next-intl";

import { Button, CardHeader, CardShell, Text } from "@/components/atoms";

interface TrackingDetailsSectionProps {
  trackingId: string;
}

export function TrackingDetailsSection({ trackingId }: TrackingDetailsSectionProps) {
  const t = useTranslations("tracking");

  const fields = [
    { label: t("orderId"), value: t("maskedValue") },
    { label: t("bookingDate"), value: t("maskedValue") },
    { label: t("from"), value: t("maskedValue") },
    { label: t("to"), value: t("maskedValue") },
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
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="font-body h-fit w-full shrink-0 px-4 py-3 text-base font-medium md:w-32 md:text-xl lg:py-5"
          >
            {t("help")}
          </Button>
        </div>
      </div>
    </CardShell>
  );
}
