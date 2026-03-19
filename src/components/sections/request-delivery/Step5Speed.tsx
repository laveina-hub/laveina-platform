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
import { cn } from "@/lib/utils";
import type { PriceBreakdown, PriceOption } from "@/types/shipment";
import { bookingStepSpeedSchema, type BookingStepSpeedInput } from "@/validations/shipment.schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

// ─── Get-rates API call ───────────────────────────────────────────────────────

async function fetchRates(params: {
  origin_postcode: string;
  destination_postcode: string;
  parcel_size: string;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  insurance_option_id: string | null;
}): Promise<PriceBreakdown> {
  const res = await fetch("/api/shipments/get-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? "Failed to get rates");
  }
  const json = await res.json();
  return json.data;
}

// ─── Create-checkout API call ─────────────────────────────────────────────────

async function createCheckout(payload: object): Promise<string> {
  const res = await fetch("/api/shipments/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? "Failed to create checkout");
  }
  const json = await res.json();
  return json.url;
}

// ─── Price option card ────────────────────────────────────────────────────────

function PriceOptionCard({
  speedKey,
  option,
  selected,
  onSelect,
  t,
}: {
  speedKey: "standard" | "express";
  option: PriceOption;
  selected: boolean;
  onSelect: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const labelKey = speedKey === "express" ? "deliveryExpress" : "deliveryStandard";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-1 flex-col rounded-xl border p-5 text-left transition-colors focus:outline-none",
        selected
          ? "border-primary-400 bg-primary-50"
          : "border-border-default hover:border-primary-200 hover:bg-primary-50 bg-white"
      )}
    >
      <span className="text-lg font-semibold">{t(labelKey)}</span>
      {option.estimatedDays && (
        <span className="text-text-muted text-sm">
          {t("estimatedDays", { days: option.estimatedDays })}
        </span>
      )}
      <span className="mt-3 text-2xl font-bold">{formatCents(option.totalCents)}</span>
      <span className="text-text-muted text-xs">{t("iva")}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step5Speed() {
  const t = useTranslations("booking");
  const {
    contact,
    origin,
    destination,
    parcel,
    parcelDimensions,
    deliveryMode,
    speed,
    priceBreakdown,
    setSpeed,
    setPriceBreakdown,
    setStep,
  } = useBookingStore();

  // Fetch rates whenever this step is mounted (priceBreakdown is cleared by setParcel).
  // Using a stable key derived from the parcel data so mutation doesn't re-fire on
  // every render but does re-fire when the user goes back and changes the parcel.
  const parcelKey = parcel
    ? `${parcel.parcel_size}-${parcel.weight_kg}-${parcel.insurance_option_id}`
    : null;

  const ratesMutation = useMutation({
    mutationFn: fetchRates,
    onSuccess: (data) => setPriceBreakdown(data),
    onError: () => toast.error(t("ratesError")),
  });

  useEffect(() => {
    if (!origin || !destination || !parcel || !parcelKey) return;
    // Use DB-resolved dimensions from store (set by Step4); fall back to constants
    // only if store entry is somehow missing (e.g., after a page reload).
    const fallback = PARCEL_SIZE_FALLBACKS[parcel.parcel_size];
    const dims = parcelDimensions ?? {
      lengthCm: fallback.lengthCm,
      widthCm: fallback.widthCm,
      heightCm: fallback.heightCm,
    };

    ratesMutation.mutate({
      origin_postcode: origin.origin_postcode,
      destination_postcode: destination.destination_postcode,
      parcel_size: parcel.parcel_size,
      weight_kg: parcel.weight_kg,
      length_cm: dims.lengthCm,
      width_cm: dims.widthCm,
      height_cm: dims.heightCm,
      insurance_option_id: parcel.insurance_option_id,
    });
    // parcelKey changes when user modifies parcel in Step4 and returns here
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
    if (!contact || !origin || !destination || !parcel || !priceBreakdown) return;
    setSpeed(data);

    await checkoutMutation.mutateAsync({
      ...contact,
      ...origin,
      ...destination,
      ...parcel,
      delivery_speed: data.delivery_speed,
    });
  }

  const breakdown = priceBreakdown;
  const isLoading = ratesMutation.isPending;
  const isInternal = deliveryMode === "internal";

  const selectedOption: PriceOption | null = breakdown
    ? selectedSpeed === "express" && breakdown.express
      ? breakdown.express
      : breakdown.standard
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <CardShell>
        <CardHeader title={t("stepSpeed")} />
        <CardBody className="space-y-6">
          {/* Route badge */}
          <p className="text-text-muted text-sm">
            {isInternal ? t("internalRoute") : t("sendcloudRoute")}
          </p>

          {isLoading && <p className="text-text-muted text-sm">{t("loadingRates")}</p>}

          {/* Speed selection (only for sendcloud) */}
          {breakdown && !isInternal && (
            <Controller
              name="delivery_speed"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <PriceOptionCard
                    speedKey="standard"
                    option={breakdown.standard}
                    selected={field.value === "standard"}
                    onSelect={() => field.onChange("standard")}
                    t={t}
                  />
                  {breakdown.express && (
                    <PriceOptionCard
                      speedKey="express"
                      option={breakdown.express}
                      selected={field.value === "express"}
                      onSelect={() => field.onChange("express")}
                      t={t}
                    />
                  )}
                </div>
              )}
            />
          )}

          {/* Internal: show standard price only */}
          {breakdown && isInternal && (
            <div className="border-border-default rounded-xl border bg-white p-5">
              <span className="text-lg font-semibold">{t("deliveryStandard")}</span>
              <p className="mt-3 text-2xl font-bold">
                {formatCents(breakdown.standard.totalCents)}
              </p>
              <p className="text-text-muted text-xs">{t("iva")}</p>
            </div>
          )}

          {/* Price breakdown */}
          {selectedOption && (
            <>
              <Divider />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">{t("shippingCost")}</span>
                  <span>{formatCents(selectedOption.shippingCents)}</span>
                </div>
                {selectedOption.insuranceSurchargeCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("insurance")}</span>
                    <span>{formatCents(selectedOption.insuranceSurchargeCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">{t("iva")}</span>
                  <span>{formatCents(selectedOption.ivaCents)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>{t("totalToPay")}</span>
                  <span>{formatCents(selectedOption.totalCents)}</span>
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
          disabled={!breakdown || checkoutMutation.isPending}
          aria-busy={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? t("loadingRates") : t("proceedToPayment")}
        </Button>
      </div>
    </form>
  );
}
