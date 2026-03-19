"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Input, Label, Select } from "@/components/atoms";
import { PARCEL_SIZE_FALLBACKS } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { cn } from "@/lib/utils";
import type { ParcelSize } from "@/types/enums";
import {
  bookingStepParcelSchema,
  type BookingStepParcelInput,
} from "@/validations/shipment.schema";

// ─── Parcel size config from DB ───────────────────────────────────────────────

type ParcelSizeConfig = {
  size: ParcelSize;
  max_weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
};

async function fetchParcelSizes(): Promise<ParcelSizeConfig[]> {
  const res = await fetch("/api/parcel-sizes");
  if (!res.ok) throw new Error("Failed to load parcel sizes");
  const json = await res.json();
  return json.data;
}

type InsuranceOption = {
  id: string;
  coverage_amount_cents: number;
  surcharge_cents: number;
  display_order: number;
};

async function fetchInsuranceOptions(): Promise<InsuranceOption[]> {
  const res = await fetch("/api/insurance-options");
  if (!res.ok) throw new Error("Failed to load insurance options");
  const json = await res.json();
  return json.data;
}

// ─── Size label map ───────────────────────────────────────────────────────────

const SIZE_LABEL_KEYS: Record<ParcelSize, string> = {
  small: "parcelSizeSmall",
  medium: "parcelSizeMedium",
  large: "parcelSizeLarge",
  extra_large: "parcelSizeExtraLarge",
  xxl: "parcelSizeXxl",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Step4Parcel() {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");
  const { parcel, setParcel, setStep } = useBookingStore();

  const { data: sizeConfigs } = useQuery({
    queryKey: ["parcel-sizes"],
    queryFn: fetchParcelSizes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: insuranceOptions } = useQuery({
    queryKey: ["insurance-options"],
    queryFn: fetchInsuranceOptions,
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BookingStepParcelInput>({
    resolver: zodResolver(bookingStepParcelSchema),
    defaultValues: parcel ?? { insurance_option_id: null },
  });

  const selectedSize = watch("parcel_size");
  const selectedWeight = watch("weight_kg");

  // Use DB config if available, fall back to constants
  function getSizeConfig(size: ParcelSize): ParcelSizeConfig {
    const fromDb = sizeConfigs?.find((s) => s.size === size);
    if (fromDb) return fromDb;
    const fb = PARCEL_SIZE_FALLBACKS[size];
    return {
      size,
      max_weight_kg: fb.maxWeightKg,
      length_cm: fb.lengthCm,
      width_cm: fb.widthCm,
      height_cm: fb.heightCm,
    };
  }

  const allSizes: ParcelSize[] = ["small", "medium", "large", "extra_large", "xxl"];

  function onSubmit(data: BookingStepParcelInput) {
    // Pass the DB-resolved dimensions so Step5 uses admin-editable values, not fallbacks
    const cfg = getSizeConfig(data.parcel_size);
    setParcel(data, { lengthCm: cfg.length_cm, widthCm: cfg.width_cm, heightCm: cfg.height_cm });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <CardShell>
        <CardHeader title={t("stepParcel")} />
        <CardBody className="space-y-6">
          {/* Parcel size grid */}
          <div className="space-y-2">
            <Label>{t("parcelSize")}</Label>
            <Controller
              name="parcel_size"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {allSizes.map((size) => {
                    const cfg = getSizeConfig(size);
                    const isSelected = field.value === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => field.onChange(size)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex flex-col items-center rounded-xl border p-4 text-center transition-colors focus:outline-none",
                          isSelected
                            ? "border-primary-400 bg-primary-50 text-primary-700"
                            : "border-border-default hover:border-primary-200 hover:bg-primary-50 bg-white"
                        )}
                      >
                        <span className="text-base font-semibold">{t(SIZE_LABEL_KEYS[size])}</span>
                        <span className="text-text-muted mt-1 text-xs">
                          {t("dimensions", {
                            l: cfg.length_cm,
                            w: cfg.width_cm,
                            h: cfg.height_cm,
                          })}
                        </span>
                        <span className="text-text-muted text-xs">
                          {t("maxWeight", { weight: cfg.max_weight_kg })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.parcel_size?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.parcel_size.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">{t("weight")}</Label>
            <Input
              id="weight_kg"
              type="number"
              step="0.1"
              min="0.1"
              max={selectedSize ? getSizeConfig(selectedSize).max_weight_kg : 25}
              placeholder={t("weightPlaceholder")}
              hasError={!!errors.weight_kg}
              aria-invalid={!!errors.weight_kg}
              {...register("weight_kg", { valueAsNumber: true })}
            />
            {selectedSize && selectedWeight > getSizeConfig(selectedSize).max_weight_kg && (
              <p role="alert" className="text-warning text-sm">
                {tv("weightMax")}
              </p>
            )}
            {errors.weight_kg?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.weight_kg.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          {/* Insurance */}
          <div className="space-y-1.5">
            <Label htmlFor="insurance_option_id">{t("insuranceOption")}</Label>
            <Controller
              name="insurance_option_id"
              control={control}
              render={({ field }) => (
                <Select
                  id="insurance_option_id"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                >
                  <option value="">{t("noInsurance")}</option>
                  {insuranceOptions?.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {t("insuranceCoverage", {
                        amount: `€${(opt.coverage_amount_cents / 100).toFixed(0)}`,
                      })}
                      {opt.surcharge_cents > 0
                        ? ` — ${t("insuranceSurcharge", { amount: `€${(opt.surcharge_cents / 100).toFixed(2)}` })}`
                        : ""}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </CardBody>
      </CardShell>

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={() => setStep(3)}>
          {t("back")}
        </Button>
        <Button type="submit" variant="primary" size="lg">
          {t("next")}
        </Button>
      </div>
    </form>
  );
}
