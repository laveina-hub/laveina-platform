"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Input, Label, Select } from "@/components/atoms";
import { PARCEL_SIZE_FALLBACKS } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import type { ParcelSize } from "@/types/enums";
import {
  bookingStepParcelSchema,
  type BookingStepParcelInput,
} from "@/validations/shipment.schema";

import { ParcelSizeGrid } from "./ParcelSizeGrid";

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

export function Step4Parcel() {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");
  const { parcels: savedParcels, deliveryMode, setParcels, setStep } = useBookingStore();

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

  const defaultParcels =
    savedParcels.length > 0
      ? savedParcels
      : [
          {
            parcel_size: undefined as unknown as ParcelSize,
            weight_kg: undefined as unknown as number,
            insurance_option_id: null,
          },
        ];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BookingStepParcelInput>({
    resolver: zodResolver(bookingStepParcelSchema),
    defaultValues: { parcels: defaultParcels },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "parcels" });

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

  function onSubmit(data: BookingStepParcelInput) {
    const dimensions = data.parcels.map((p) => {
      const cfg = getSizeConfig(p.parcel_size);
      return { lengthCm: cfg.length_cm, widthCm: cfg.width_cm, heightCm: cfg.height_cm };
    });
    setParcels(data.parcels, dimensions);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {fields.map((field, index) => {
        const selectedSize = watch(`parcels.${index}.parcel_size`);
        const selectedWeight = watch(`parcels.${index}.weight_kg`);

        return (
          <CardShell key={field.id}>
            <CardHeader
              title={fields.length > 1 ? `${t("stepParcel")} #${index + 1}` : t("stepParcel")}
            />
            <CardBody className="space-y-6">
              <div className="space-y-2">
                <Label>{t("parcelSize")}</Label>
                <Controller
                  name={`parcels.${index}.parcel_size`}
                  control={control}
                  render={({ field: sizeField }) => (
                    <ParcelSizeGrid
                      selectedSize={sizeField.value}
                      onSelect={sizeField.onChange}
                      getSizeConfig={getSizeConfig}
                    />
                  )}
                />
                {errors.parcels?.[index]?.parcel_size?.message && (
                  <p role="alert" className="text-error text-sm">
                    {tv(errors.parcels[index].parcel_size.message.replace("validation.", ""))}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`weight_kg_${index}`}>{t("weight")}</Label>
                <Input
                  id={`weight_kg_${index}`}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={selectedSize ? getSizeConfig(selectedSize).max_weight_kg : 25}
                  placeholder={t("weightPlaceholder")}
                  hasError={!!errors.parcels?.[index]?.weight_kg}
                  aria-invalid={!!errors.parcels?.[index]?.weight_kg}
                  {...register(`parcels.${index}.weight_kg`, { valueAsNumber: true })}
                />
                {selectedSize && selectedWeight > getSizeConfig(selectedSize).max_weight_kg && (
                  <p role="alert" className="text-warning text-sm">
                    {tv("weightMax")}
                  </p>
                )}
                {errors.parcels?.[index]?.weight_kg?.message && (
                  <p role="alert" className="text-error text-sm">
                    {tv(errors.parcels[index].weight_kg.message.replace("validation.", ""))}
                  </p>
                )}
              </div>

              {/* Insurance tiers only available for Barcelona internal routes */}
              {deliveryMode === "internal" && (
                <div className="space-y-1.5">
                  <Label htmlFor={`insurance_${index}`}>{t("insuranceOption")}</Label>
                  <Controller
                    name={`parcels.${index}.insurance_option_id`}
                    control={control}
                    render={({ field: insField }) => (
                      <Select
                        id={`insurance_${index}`}
                        value={insField.value ?? ""}
                        onChange={(e) => insField.onChange(e.target.value || null)}
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
              )}
              {deliveryMode === "sendcloud" && (
                <p className="text-text-muted text-sm">{t("carrierInsuranceIncluded")}</p>
              )}

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-error"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t("removeParcel")}
                </Button>
              )}
            </CardBody>
          </CardShell>
        );
      })}

      {/* Max 20 parcels to match API limit */}
      {fields.length < 20 && (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            append({ parcel_size: "small", weight_kg: 0.5, insurance_option_id: null })
          }
          className="w-full"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addParcel")}
        </Button>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(3)}>
          {t("back")}
        </Button>
        <Button type="submit" variant="primary">
          {t("next")}
        </Button>
      </div>
    </form>
  );
}
