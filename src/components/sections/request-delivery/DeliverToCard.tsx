"use client";

import { useTranslations } from "next-intl";

import { CardBody, CardHeader, CardShell, Input, Select } from "@/components/atoms";
import { MapPlaceholder } from "@/components/molecules";

interface DeliverToCardProps {
  className?: string;
}

/** Delivery destination card — postal code, pickup point selects, and map placeholder. */
export function DeliverToCard({ className }: DeliverToCardProps) {
  const t = useTranslations("requestDelivery");

  return (
    <CardShell className={className}>
      <CardHeader title={t("deliverTo")} />

      <CardBody>
        <Input type="text" placeholder={t("postalCode")} maxLength={5} />

        <Select defaultValue="">
          <option value="" disabled>
            {t("pickupPoint")}
          </option>
        </Select>

        <Select defaultValue="">
          <option value="" disabled>
            {t("destinationPickupPoint")}
          </option>
        </Select>

        <MapPlaceholder />
      </CardBody>
    </CardShell>
  );
}
