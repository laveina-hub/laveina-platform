"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CardBody, CardHeader, CardShell, Input, Select } from "@/components/atoms";
import { FormRow, QuantityStepper } from "@/components/molecules";

interface ShipmentDetailsCardProps {
  className?: string;
}

/** Shipment details card — package type, description, and quantity controls. */
export function ShipmentDetailsCard({ className }: ShipmentDetailsCardProps) {
  const t = useTranslations("requestDelivery");
  const [quantity, setQuantity] = useState(1);
  const [packageType, setPackageType] = useState("parcel");
  const [description, setDescription] = useState("");

  return (
    <CardShell className={className}>
      <CardHeader title={t("shipmentDetails")} />

      <CardBody>
        <FormRow label={t("packageType")}>
          <Select value={packageType} onChange={(e) => setPackageType(e.target.value)}>
            <option value="parcel">{t("parcel")}</option>
            <option value="document">{t("document")}</option>
            <option value="fragile">{t("fragile")}</option>
          </Select>
        </FormRow>

        <FormRow label={t("packageDescription")}>
          <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormRow>

        <FormRow label={t("quantity")}>
          <QuantityStepper
            value={quantity}
            onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
            onIncrement={() => setQuantity(quantity + 1)}
            decreaseLabel={t("decreaseQuantity")}
            increaseLabel={t("increaseQuantity")}
          />
        </FormRow>
      </CardBody>
    </CardShell>
  );
}
