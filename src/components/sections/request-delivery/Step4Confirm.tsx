"use client";

import { useTranslations } from "next-intl";

import { MapPinIcon, NavigationIcon } from "@/components/icons";
import { InsuranceSection, SpeedSelector } from "@/components/molecules";
import { type CutoffConfig } from "@/constants/cutoff-times";
import { type ParcelPreset } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { useStep4Checkout } from "@/hooks/use-step4-checkout";
import { useStep4Pricing, type BcnPricesCents } from "@/hooks/use-step4-pricing";
import { formatCents } from "@/lib/format";

import { InfoCard } from "./Step4Confirm.Helpers";
import { Step4PaymentSummary } from "./Step4Confirm.PaymentSummary";

// Step 4 — Review & Payment (client Final A2, 2026-04-23):
// - Speed is picked on this step, after the route is known. Per Final A2,
//   BCN → BCN routes show Standard / Express / Next Day; any other route
//   shows Standard / Express only (Next Day is hidden, not disabled).
// - Speed displayed is `actualSpeed ?? requestedSpeed` so an auto-switched
//   Next Day → Express shows Express (happens if user goes back to Step 2
//   and changes destination to a non-BCN postcode).

type Props = {
  presets: ParcelPreset[];
  bcnPrices: BcnPricesCents;
  cutoffConfig: CutoffConfig;
};

export function Step4Confirm({ presets, bcnPrices, cutoffConfig }: Props) {
  const t = useTranslations("booking");
  const tPresets = useTranslations("parcelPresets");
  const {
    parcels,
    origin,
    destination,
    sender,
    recipient,
    setRequestedSpeed,
    updateParcel,
    setStep,
  } = useBookingStore();

  const {
    speed,
    primaryPreset,
    PrimaryIcon,
    lineItems,
    deliveryCents,
    insuranceTotalCents,
    subtotalCents,
    vatCents,
    grandTotalCents,
    availableSpeeds,
    priceBySpeed,
  } = useStep4Pricing({ presets, bcnPrices });

  const { isSubmitting, submit } = useStep4Checkout({ presets, speed });

  const originPointsQuery = usePickupPoints(origin?.postcode);
  const destinationPointsQuery = usePickupPoints(destination?.postcode);
  const originPoint = originPointsQuery.data?.find((p) => p.id === origin?.pickupPointId);
  const destinationPoint = destinationPointsQuery.data?.find(
    (p) => p.id === destination?.pickupPointId
  );

  const hasRequiredData =
    lineItems.length === parcels.length &&
    parcels.length > 0 &&
    !!sender &&
    !!recipient &&
    !!origin?.pickupPointId &&
    !!destination?.pickupPointId;
  const canPay = hasRequiredData && !isSubmitting;

  const primarySubtitle = primaryPreset
    ? `${t("upToWeight", { weight: `${primaryPreset.maxWeightKg}kg` })} | ${t("dimensionsLabel", {
        length: primaryPreset.lengthCm,
        width: primaryPreset.widthCm,
        height: primaryPreset.heightCm,
      })}`
    : undefined;

  const primaryCardTitle = primaryPreset
    ? parcels.length > 1
      ? t("multiparcelCardTitle", {
          primary: tPresets(`${primaryPreset.slug}.name`),
          count: parcels.length,
        })
      : tPresets(`${primaryPreset.slug}.name`)
    : "—";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-text-muted -mt-4 text-sm sm:-mt-6">{t("reviewShipmentSubtitle")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={PrimaryIcon}
          title={primaryCardTitle}
          subtitle={primarySubtitle}
          editLabel={t("editStepSize")}
          onEdit={() => setStep(1)}
          titleClassName="text-base font-semibold"
        />
        <InfoCard
          icon={MapPinIcon}
          title={destinationPoint?.name ?? "—"}
          subtitle={destinationPoint?.address}
          editLabel={t("editStepDestination")}
          onEdit={() => setStep(2)}
        />
        <InfoCard
          icon={NavigationIcon}
          title={originPoint?.name ?? "—"}
          subtitle={originPoint?.address}
          editLabel={t("editStepOrigin")}
          onEdit={() => setStep(2)}
        />
      </div>

      <SpeedSelector
        value={speed}
        onChange={setRequestedSpeed}
        priceBySpeed={priceBySpeed}
        cutoffConfig={cutoffConfig}
        availableSpeeds={availableSpeeds}
      />

      {parcels.length > 1 && lineItems.length > 0 && (
        <section className="border-border-muted rounded-2xl border bg-white p-5">
          <h2 className="text-text-primary mb-3 text-sm font-semibold">
            {t("multiparcelBreakdownTitle")}
          </h2>
          <dl className="divide-border-muted flex flex-col divide-y text-sm">
            {lineItems.map((item, index) => (
              <div
                key={`${item.preset.slug}-${index}`}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <dt className="text-text-primary">
                  {t("multiparcelBreakdownLine", {
                    index: index + 1,
                    preset: tPresets(`${item.preset.slug}.name`),
                  })}
                </dt>
                <dd className="text-text-primary font-medium tabular-nums">
                  {formatCents(item.shippingExVatCents)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <InsuranceSection
        parcels={parcels}
        onChangeParcel={(index, next) => updateParcel(index, next)}
      />

      <Step4PaymentSummary
        deliveryCents={deliveryCents}
        insuranceTotalCents={insuranceTotalCents}
        subtotalCents={subtotalCents}
        vatCents={vatCents}
        grandTotalCents={grandTotalCents}
        canPay={canPay}
        onPay={submit}
      />
    </div>
  );
}
