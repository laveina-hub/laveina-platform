"use client";

import { useTranslations } from "next-intl";

import { MapPinIcon, NavigationIcon, SpinnerIcon } from "@/components/icons";
import { InsuranceSection, SpeedSelector } from "@/components/molecules";
import { type CutoffConfig } from "@/constants/cutoff-times";
import { type ParcelPreset } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { useQuote } from "@/hooks/use-quote";
import { useStep4Checkout } from "@/hooks/use-step4-checkout";
import { useStep4Pricing } from "@/hooks/use-step4-pricing";
import { formatCents } from "@/lib/format";
import { isBarcelonaRoute } from "@/services/routing.service";

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
  cutoffConfig: CutoffConfig;
};

export function Step4Confirm({ presets, cutoffConfig }: Props) {
  const t = useTranslations("booking");
  const tPresets = useTranslations("parcelPresets");
  const {
    parcels,
    origin,
    destination,
    sender,
    recipient,
    quote,
    setRequestedSpeed,
    setParcelInsurance,
    setStep,
  } = useBookingStore();

  // Defense-in-depth re-quote: if the quote was invalidated upstream (e.g.
  // back-nav from another step that touched parcels/origin/destination)
  // re-fire `/api/shipments/quote` from Step 4 so prices stay live with the
  // current inputs. Insurance edits do NOT trip this hook because they go
  // through `setParcelInsurance`, which preserves the cached quote.
  const quoteQuery = useQuote({
    originPostcode: origin?.postcode ?? null,
    destinationPostcode: destination?.postcode ?? null,
    parcels,
  });

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
  } = useStep4Pricing({ presets });

  const { isSubmitting, submit } = useStep4Checkout({ presets, speed });

  const isQuoting = quoteQuery.isFetching && !quote;
  const quoteFailed = quoteQuery.isError && !quote;

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
    !!destination?.pickupPointId &&
    origin.pickupPointId !== destination.pickupPointId;
  // Pay must wait on a fresh quote: when the cached quote is missing
  // `lineItems` is empty (no BCN-default fallback), so `hasRequiredData` is
  // already false. Adding `!isQuoting && !quoteFailed` makes the disabled
  // state explicit while the network call is in flight.
  const canPay = hasRequiredData && !isSubmitting && !isQuoting && !quoteFailed;

  // Custom-size parcels (preset_slug === null) carry user-supplied dims +
  // weight. The server resolves them to a band for pricing, but the card
  // here should reflect what the user actually picked: a "Custom size" label
  // and their entered dims/weight, matching the per-row summary in
  // ParcelRow. Without this branch, both title and subtitle collapse to "—"
  // because `primaryPreset` is null.
  const firstParcel = parcels[0];
  const firstParcelIsCustom =
    !!firstParcel &&
    firstParcel.preset_slug === null &&
    typeof firstParcel.length_cm === "number" &&
    typeof firstParcel.width_cm === "number" &&
    typeof firstParcel.height_cm === "number";

  const primarySubtitle = primaryPreset
    ? `${t("upToWeight", { weight: `${primaryPreset.maxWeightKg}kg` })} | ${t("dimensionsLabel", {
        length: primaryPreset.lengthCm,
        width: primaryPreset.widthCm,
        height: primaryPreset.heightCm,
      })}`
    : firstParcelIsCustom
      ? `${t("upToWeight", { weight: `${firstParcel.weight_kg}kg` })} | ${t("dimensionsLabel", {
          length: firstParcel.length_cm,
          width: firstParcel.width_cm,
          height: firstParcel.height_cm,
        })}`
      : undefined;

  const primaryCardTitle = primaryPreset
    ? parcels.length > 1
      ? t("multiparcelCardTitle", {
          primary: tPresets(`${primaryPreset.slug}.name`),
          count: parcels.length,
        })
      : tPresets(`${primaryPreset.slug}.name`)
    : firstParcelIsCustom
      ? parcels.length > 1
        ? t("multiparcelCardTitle", {
            primary: t("customSizeToggle"),
            count: parcels.length,
          })
        : t("customSizeToggle")
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

      <InsuranceSection parcels={parcels} onChangeInsurance={setParcelInsurance} />

      {(isQuoting || quoteFailed) && (
        <div
          role={quoteFailed ? "alert" : "status"}
          aria-live="polite"
          className={
            quoteFailed
              ? "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
              : "text-text-muted flex items-center gap-2 text-sm"
          }
        >
          {quoteFailed ? (
            <div className="flex-1">
              <p className="font-semibold text-amber-900">{t("quoteUnavailableTitle")}</p>
              <p className="mt-0.5 text-amber-800">{t("quoteUnavailableBody")}</p>
            </div>
          ) : (
            <>
              <SpinnerIcon className="text-primary-500 h-4 w-4 animate-spin" aria-hidden />
              <span>
                {isBarcelonaRoute(origin?.postcode ?? "", destination?.postcode ?? "")
                  ? t("calculatingDelivery")
                  : t("checkingCarrierRates")}
              </span>
            </>
          )}
        </div>
      )}

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
