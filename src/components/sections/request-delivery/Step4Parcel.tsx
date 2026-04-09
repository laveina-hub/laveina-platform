"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Plus, Scale, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Input, Label, Select } from "@/components/atoms";
import {
  calcBillableWeightKg,
  calcVolumetricWeightKg,
  MAX_TOTAL_DIMENSIONS_CM,
  MAX_LONGEST_SIDE_CM,
  MAX_WEIGHT_KG,
} from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { cn } from "@/lib/utils";
import {
  bookingStepParcelSchema,
  type BookingStepParcelInput,
} from "@/validations/shipment.schema";

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
            length_cm: undefined as unknown as number,
            width_cm: undefined as unknown as number,
            height_cm: undefined as unknown as number,
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

  function onSubmit(data: BookingStepParcelInput) {
    setParcels(data.parcels);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {fields.map((field, index) => {
        const lengthCm = watch(`parcels.${index}.length_cm`);
        const widthCm = watch(`parcels.${index}.width_cm`);
        const heightCm = watch(`parcels.${index}.height_cm`);
        const weightKg = watch(`parcels.${index}.weight_kg`);

        const hasDimensions = lengthCm > 0 && widthCm > 0 && heightCm > 0;
        const hasWeight = weightKg > 0;

        const totalDimensions = hasDimensions ? lengthCm + widthCm + heightCm : 0;
        const volumetricKg = hasDimensions
          ? calcVolumetricWeightKg(lengthCm, widthCm, heightCm)
          : 0;
        const billableKg =
          hasDimensions && hasWeight
            ? calcBillableWeightKg(weightKg, lengthCm, widthCm, heightCm)
            : 0;
        const isVolumetricHigher = hasDimensions && hasWeight && volumetricKg > weightKg;

        return (
          <CardShell
            key={field.id}
            className="animate-fade-in-up border-border-muted border shadow-md transition-shadow hover:shadow-lg"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CardHeader
              title={fields.length > 1 ? `${t("stepParcel")} #${index + 1}` : t("stepParcel")}
            />
            <CardBody className="space-y-6">
              {/* Dimensions */}
              <div className="space-y-2">
                <Label>{t("dimensions")}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`length_${index}`} className="text-text-muted text-xs">
                      {t("length")} (cm)
                    </Label>
                    <Input
                      id={`length_${index}`}
                      type="number"
                      step="1"
                      min="1"
                      max={MAX_LONGEST_SIDE_CM}
                      placeholder="cm"
                      hasError={!!errors.parcels?.[index]?.length_cm}
                      {...register(`parcels.${index}.length_cm`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`width_${index}`} className="text-text-muted text-xs">
                      {t("width")} (cm)
                    </Label>
                    <Input
                      id={`width_${index}`}
                      type="number"
                      step="1"
                      min="1"
                      max={MAX_LONGEST_SIDE_CM}
                      placeholder="cm"
                      hasError={!!errors.parcels?.[index]?.width_cm}
                      {...register(`parcels.${index}.width_cm`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`height_${index}`} className="text-text-muted text-xs">
                      {t("height")} (cm)
                    </Label>
                    <Input
                      id={`height_${index}`}
                      type="number"
                      step="1"
                      min="1"
                      max={MAX_LONGEST_SIDE_CM}
                      placeholder="cm"
                      hasError={!!errors.parcels?.[index]?.height_cm}
                      {...register(`parcels.${index}.height_cm`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
                {hasDimensions && (
                  <p
                    className={cn(
                      "text-xs",
                      totalDimensions > MAX_TOTAL_DIMENSIONS_CM ? "text-error" : "text-text-muted"
                    )}
                  >
                    {t("totalDimensions")}: {totalDimensions} cm / {MAX_TOTAL_DIMENSIONS_CM} cm
                  </p>
                )}
                {errors.parcels?.[index]?.length_cm?.message && (
                  <p role="alert" className="text-error text-sm">
                    {tv(errors.parcels[index].length_cm.message.replace("validation.", ""))}
                  </p>
                )}
              </div>

              {/* Weight */}
              <div className="space-y-1.5">
                <Label htmlFor={`weight_kg_${index}`}>{t("weight")}</Label>
                <Input
                  id={`weight_kg_${index}`}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={MAX_WEIGHT_KG}
                  placeholder={t("weightPlaceholder")}
                  hasError={!!errors.parcels?.[index]?.weight_kg}
                  {...register(`parcels.${index}.weight_kg`, { valueAsNumber: true })}
                />
                {errors.parcels?.[index]?.weight_kg?.message && (
                  <p role="alert" className="text-error text-sm">
                    {tv(errors.parcels[index].weight_kg.message.replace("validation.", ""))}
                  </p>
                )}
              </div>

              {/* Live weight calculation */}
              {hasDimensions && hasWeight && billableKg > 0 && (
                <div className="animate-fade-in border-primary-200 bg-primary-50 space-y-2 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Scale className="text-primary-600 h-4 w-4" />
                    <span className="text-primary-700 text-sm font-semibold">
                      {t("weightCalculation")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-text-muted">{t("actualWeight")}:</span>
                    <span className={cn("font-medium", !isVolumetricHigher && "text-primary-700")}>
                      {weightKg.toFixed(1)} kg
                      {!isVolumetricHigher && " ✓"}
                    </span>
                    <span className="text-text-muted">{t("volumetricWeight")}:</span>
                    <span className={cn("font-medium", isVolumetricHigher && "text-primary-700")}>
                      {volumetricKg.toFixed(2)} kg
                      {isVolumetricHigher && " ✓"}
                    </span>
                    <span className="text-text-muted font-semibold">{t("billableWeight")}:</span>
                    <span className="text-primary-700 font-bold">{billableKg.toFixed(2)} kg</span>
                  </div>
                </div>
              )}

              {/* Insurance */}
              {deliveryMode === "internal" && (
                <div className="space-y-1.5">
                  <Label htmlFor={`insurance_${index}`}>{t("insuranceOption")}</Label>
                  <Select
                    id={`insurance_${index}`}
                    {...register(`parcels.${index}.insurance_option_id`, {
                      setValueAs: (v: string) => v || null,
                    })}
                    defaultValue=""
                  >
                    <option value="">{t("noInsurance")}</option>
                    {insuranceOptions?.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {t("insuranceCoverage", {
                          amount: `${(opt.coverage_amount_cents / 100).toFixed(0)}`,
                        })}
                        {opt.surcharge_cents > 0
                          ? ` — ${t("insuranceSurcharge", { amount: `${(opt.surcharge_cents / 100).toFixed(2)}` })}`
                          : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {deliveryMode === "sendcloud" && (
                <p className="text-text-muted text-sm">{t("carrierInsuranceIncluded")}</p>
              )}

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-error hover:bg-red-50"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t("removeParcel")}
                </Button>
              )}
            </CardBody>
          </CardShell>
        );
      })}

      {fields.length < 20 && (
        <button
          type="button"
          onClick={() =>
            append({
              length_cm: undefined as unknown as number,
              width_cm: undefined as unknown as number,
              height_cm: undefined as unknown as number,
              weight_kg: undefined as unknown as number,
              insurance_option_id: null,
            })
          }
          className="border-primary-300 text-primary-600 hover:border-primary-400 hover:bg-primary-50 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 font-medium transition-colors"
        >
          <Plus className="h-5 w-5" />
          {t("addParcel")}
        </button>
      )}

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setStep(3)}
          className="group gap-2"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          {t("back")}
        </Button>
        <Button type="submit" variant="primary" size="lg" className="group gap-2">
          {t("next")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </form>
  );
}
