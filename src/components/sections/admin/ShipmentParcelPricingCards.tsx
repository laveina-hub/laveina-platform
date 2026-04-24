"use client";

// SAFETY: enum casts in this file (delivery_speed → DeliverySpeed, preset slug
// narrowing) are backed by DB CHECK constraints and the DEFAULT_PARCEL_PRESETS
// seed; Supabase-generated Row types already constrain the string values.

import { useTranslations } from "next-intl";

import { DeliverySpeedBadge } from "@/components/atoms";
import { WEIGHT_TIERS } from "@/constants/parcel-sizes";
import { formatCents } from "@/lib/format";
import type { DeliverySpeed } from "@/types/enums";
import type { ShipmentWithRelations } from "@/types/shipment";

type ParcelPresetKey = "mini" | "small" | "medium" | "large";
const PRESET_KEYS: readonly ParcelPresetKey[] = ["mini", "small", "medium", "large"];

type Props = {
  shipment: ShipmentWithRelations;
};

/** Parcel + pricing info cards for the admin shipment detail page. */
export function ShipmentParcelPricingCards({ shipment }: Props) {
  const t = useTranslations("adminShipments");
  const tCommon = useTranslations("common");
  const tSpeed = useTranslations("deliverySpeed");
  const tPresets = useTranslations("parcelPresets");

  return (
    <>
      <div className="border-border-default rounded-xl border bg-white p-5">
        <h2 className="text-text-primary mb-4 text-base font-semibold">{t("parcelInfo")}</h2>
        <dl className="space-y-3 text-sm">
          <InfoRow
            label={t("size")}
            value={(() => {
              const slug = shipment.parcel_preset_slug;
              if (slug && (PRESET_KEYS as readonly string[]).includes(slug)) {
                return tPresets(`${slug as ParcelPresetKey}.name`);
              }
              const tier = WEIGHT_TIERS.find((w) => w.size === shipment.parcel_size);
              return tier ? `${tier.minWeightKg}–${tier.maxWeightKg} kg` : shipment.parcel_size;
            })()}
          />
          <InfoRow
            label={t("weight")}
            value={
              shipment.billable_weight_kg > shipment.weight_kg
                ? tCommon("billableWeight", {
                    weight: shipment.weight_kg,
                    billable: shipment.billable_weight_kg,
                  })
                : tCommon("weightKg", { value: shipment.weight_kg })
            }
          />
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">{t("speed")}</dt>
            <dd>
              <DeliverySpeedBadge
                speed={shipment.delivery_speed as DeliverySpeed}
                label={tSpeed(shipment.delivery_speed as DeliverySpeed)}
              />
            </dd>
          </div>
          <InfoRow
            label={t("preferredLocale")}
            value={(shipment.preferred_locale ?? "").toUpperCase() || "—"}
          />
          {shipment.carrier_name && <InfoRow label={t("carrier")} value={shipment.carrier_name} />}
          {shipment.carrier_tracking_number && (
            <InfoRow label={t("carrierTracking")} value={shipment.carrier_tracking_number} />
          )}
          {shipment.sendcloud_parcel_id && (
            <InfoRow label={t("sendcloudParcelId")} value={String(shipment.sendcloud_parcel_id)} />
          )}
        </dl>
      </div>

      <div className="border-border-default rounded-xl border bg-white p-5">
        <h2 className="text-text-primary mb-4 text-base font-semibold">{t("pricingInfo")}</h2>
        <dl className="space-y-3 text-sm">
          {(() => {
            // Q15.2 derivation: shipments.price_cents is the VAT-inclusive
            // total (Subtotal + VAT). Back out the ex-VAT split for the admin
            // view so the breakdown matches the customer invoice.
            const IVA_RATE = 0.21;
            const total = shipment.price_cents;
            const insurance = shipment.insurance_surcharge_cents ?? 0;
            const subtotal = Math.round(total / (1 + IVA_RATE));
            const vat = total - subtotal;
            const delivery = subtotal - insurance;
            return (
              <>
                <InfoRow label={t("shipping")} value={formatCents(delivery)} />
                <InfoRow label={t("insurance")} value={formatCents(insurance)} />
                {shipment.insurance_amount_cents > 0 ? (
                  <InfoRow
                    label={t("declaredValue")}
                    value={formatCents(shipment.insurance_amount_cents)}
                  />
                ) : null}
                <div className="border-border-muted border-t pt-3">
                  <InfoRow label={t("subtotal")} value={formatCents(subtotal)} />
                </div>
                <InfoRow label={t("vat")} value={formatCents(vat)} />
                <div className="border-border-muted border-t pt-3">
                  <InfoRow label={t("total")} value={formatCents(total)} bold />
                </div>
              </>
            );
          })()}
        </dl>
      </div>
    </>
  );
}

export function InfoRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className={bold ? "text-text-primary font-semibold" : "text-text-primary"}>{value}</dd>
    </div>
  );
}
