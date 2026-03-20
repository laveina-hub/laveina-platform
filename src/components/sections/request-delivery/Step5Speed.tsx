"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, CardBody, CardHeader, CardShell, Divider } from "@/components/atoms";
import { PARCEL_SIZE_FALLBACKS } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { bookingStepSpeedSchema, type BookingStepSpeedInput } from "@/validations/shipment.schema";

import {
  PriceOptionCard,
  createCheckout,
  fetchRates,
  formatCents,
  sumOption,
} from "./Step5Helpers";

// ─── Main component ───────────────────────────────────────────────────────────

export function Step5Speed() {
  const t = useTranslations("booking");
  const {
    contact,
    origin,
    destination,
    parcels,
    parcelDimensionsList,
    deliveryMode,
    speed,
    priceBreakdowns,
    setSpeed,
    setPriceBreakdowns,
    setStep,
  } = useBookingStore();

  const parcelKey =
    parcels.length > 0
      ? parcels.map((p) => `${p.parcel_size}-${p.weight_kg}-${p.insurance_option_id}`).join("|")
      : null;

  const ratesMutation = useMutation({
    mutationFn: fetchRates,
    onSuccess: (data) => setPriceBreakdowns(data),
    onError: () => toast.error(t("ratesError")),
  });

  useEffect(() => {
    if (!origin || !destination || parcels.length === 0 || !parcelKey) return;

    const parcelParams = parcels.map((p, i) => {
      const stored = parcelDimensionsList[i];
      const fallback = PARCEL_SIZE_FALLBACKS[p.parcel_size];
      return {
        parcel_size: p.parcel_size,
        weight_kg: p.weight_kg,
        length_cm: stored?.lengthCm ?? fallback.lengthCm,
        width_cm: stored?.widthCm ?? fallback.widthCm,
        height_cm: stored?.heightCm ?? fallback.heightCm,
        insurance_option_id: p.insurance_option_id,
      };
    });

    ratesMutation.mutate({
      origin_postcode: origin.origin_postcode,
      destination_postcode: destination.destination_postcode,
      parcels: parcelParams,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelKey]);

  const checkoutMutation = useMutation({
    mutationFn: createCheckout,
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => toast.error(t("ratesError")),
  });

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BookingStepSpeedInput>({
    resolver: zodResolver(bookingStepSpeedSchema),
    defaultValues: speed ?? { delivery_speed: "standard" },
  });

  const selectedSpeed = watch("delivery_speed");

  async function onSubmit(data: BookingStepSpeedInput) {
    if (!contact || !origin || !destination || parcels.length === 0 || !priceBreakdowns) return;
    setSpeed(data);

    await checkoutMutation.mutateAsync({
      ...contact,
      ...origin,
      ...destination,
      parcels: parcels.map((p) => ({
        parcel_size: p.parcel_size,
        weight_kg: p.weight_kg,
        insurance_option_id: p.insurance_option_id,
      })),
      delivery_speed: data.delivery_speed,
    });
  }

  const breakdowns = priceBreakdowns;
  const isLoading = ratesMutation.isPending;

  const standardSum = breakdowns ? sumOption(breakdowns, "standard") : null;
  const expressSum = breakdowns ? sumOption(breakdowns, "express") : null;
  const hasExpress = expressSum?.available ?? false;

  const selectedSum = breakdowns
    ? selectedSpeed === "express" && hasExpress
      ? expressSum
      : standardSum
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <CardShell>
        <CardHeader title={t("stepSpeed")} />
        <CardBody className="space-y-6">
          <p className="text-text-muted text-sm">
            {deliveryMode === "internal" ? t("internalRoute") : t("sendcloudRoute")}
            {parcels.length > 1 && ` · ${parcels.length} ${t("parcelsCount")}`}
          </p>

          {isLoading && <p className="text-text-muted text-sm">{t("loadingRates")}</p>}

          {/* Speed selection */}
          {standardSum && (
            <Controller
              name="delivery_speed"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <PriceOptionCard
                    speedKey="standard"
                    totalCents={standardSum.totalCents}
                    estimatedDays={breakdowns?.[0]?.standard.estimatedDays ?? null}
                    selected={field.value === "standard"}
                    onSelect={() => field.onChange("standard")}
                    t={t}
                  />
                  {hasExpress && expressSum && (
                    <PriceOptionCard
                      speedKey="express"
                      totalCents={expressSum.totalCents}
                      estimatedDays={breakdowns?.[0]?.express?.estimatedDays ?? null}
                      selected={field.value === "express"}
                      onSelect={() => field.onChange("express")}
                      t={t}
                    />
                  )}
                </div>
              )}
            />
          )}

          {/* Price breakdown */}
          {selectedSum && (
            <>
              <Divider />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t("shippingCost")}</span>
                  <span>{formatCents(selectedSum.shippingCents)}</span>
                </div>
                {selectedSum.insuranceSurchargeCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("insurance")}</span>
                    <span>{formatCents(selectedSum.insuranceSurchargeCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">{t("iva")}</span>
                  <span>{formatCents(selectedSum.ivaCents)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>{t("totalToPay")}</span>
                  <span>{formatCents(selectedSum.totalCents)}</span>
                </div>
              </div>
            </>
          )}

          {errors.delivery_speed?.message && (
            <p role="alert" className="text-error text-sm">
              {errors.delivery_speed.message}
            </p>
          )}
        </CardBody>
      </CardShell>

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={() => setStep(4)}>
          {t("back")}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!breakdowns || checkoutMutation.isPending}
          aria-busy={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? t("loadingRates") : t("proceedToPayment")}
        </Button>
      </div>
    </form>
  );
}
