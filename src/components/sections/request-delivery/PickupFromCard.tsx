"use client";

import { useTranslations } from "next-intl";

import { CardBody, CardHeader, CardShell, Input } from "@/components/atoms";
import { MapPlaceholder } from "@/components/molecules";

interface PickupFromCardProps {
  className?: string;
}

/** Pickup origin card — sender address inputs and map placeholder. */
export function PickupFromCard({ className }: PickupFromCardProps) {
  const t = useTranslations("requestDelivery");

  return (
    <CardShell className={className}>
      <CardHeader title={t("pickupFrom")} />

      <CardBody>
        <Input type="text" placeholder={t("pickupAddress")} />
        <Input type="text" placeholder={t("contactName")} />
        <Input type="tel" placeholder={t("phoneNumber")} />
        <MapPlaceholder />
      </CardBody>
    </CardShell>
  );
}
