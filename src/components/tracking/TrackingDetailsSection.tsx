import { useTranslations } from "next-intl";

import { Button, Heading, Text } from "@/components/atoms";

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
    <section className="rounded-xl bg-white shadow-sm">
      <div className="border-border-muted border-b px-6 py-5 md:px-8">
        <Heading variant="card">{t("trackingIdLabel", { trackingId })}</Heading>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-end md:gap-4 md:px-8">
        {fields.map((field) => (
          <div key={field.label} className="flex-1">
            <Text variant="label" as="label" className="mb-1.5 block">
              {field.label}
            </Text>
            <div className="border-border-default font-body text-text-muted rounded-lg border px-4 py-2.5 text-sm">
              {field.value}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="font-body shrink-0 self-end font-semibold md:self-auto"
        >
          {t("help")}
        </Button>
      </div>
    </section>
  );
}
