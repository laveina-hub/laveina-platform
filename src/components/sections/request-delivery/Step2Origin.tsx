"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Input, Label } from "@/components/atoms";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { cn } from "@/lib/utils";
import {
  bookingStepOriginSchema,
  type BookingStepOriginInput,
} from "@/validations/shipment.schema";

export function Step2Origin() {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");
  const { origin, setOrigin, setStep } = useBookingStore();

  const [postcodeInput, setPostcodeInput] = useState(origin?.origin_postcode ?? "");
  const [searchPostcode, setSearchPostcode] = useState(origin?.origin_postcode ?? "");

  const { data: pickupPoints, isFetching } = usePickupPoints(
    searchPostcode.length === 5 ? searchPostcode : undefined
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingStepOriginInput>({
    resolver: zodResolver(bookingStepOriginSchema),
    defaultValues: origin ?? undefined,
  });

  const selectedPointId = watch("origin_pickup_point_id");

  function onSubmit(data: BookingStepOriginInput) {
    setOrigin(data);
  }

  function handlePostcodeSearch() {
    if (/^[0-9]{5}$/.test(postcodeInput)) {
      setSearchPostcode(postcodeInput);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <CardShell>
        <CardHeader title={t("stepOrigin")} />
        <CardBody className="space-y-4">
          {/* Hidden field for postcode — registered into form */}
          <input type="hidden" {...register("origin_postcode")} value={postcodeInput} />

          {/* Postcode search */}
          <div className="space-y-1.5">
            <Label htmlFor="origin_postcode">{t("originPostcode")}</Label>
            <div className="flex gap-2">
              <Input
                id="origin_postcode"
                type="text"
                placeholder={t("postcodePlaceholder")}
                maxLength={5}
                value={postcodeInput}
                onChange={(e) => {
                  setPostcodeInput(e.target.value);
                  setValue("origin_postcode", e.target.value);
                }}
                hasError={!!errors.origin_postcode}
                aria-invalid={!!errors.origin_postcode}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handlePostcodeSearch}
                disabled={postcodeInput.length !== 5}
              >
                {t("searchPickupPoints")}
              </Button>
            </div>
            {errors.origin_postcode?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.origin_postcode.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          {/* Pickup point list */}
          {isFetching && <p className="text-text-muted text-sm">{t("searchingPickupPoints")}</p>}

          {!isFetching && pickupPoints && pickupPoints.length === 0 && searchPostcode && (
            <p className="text-text-muted text-sm">{t("noPickupPoints")}</p>
          )}

          {pickupPoints && pickupPoints.length > 0 && (
            <div className="space-y-2">
              <Label>{t("selectPickupPoint")}</Label>
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {pickupPoints.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() =>
                      setValue("origin_pickup_point_id", point.id, { shouldValidate: true })
                    }
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors focus:outline-none",
                      selectedPointId === point.id
                        ? "border-primary-400 bg-primary-50"
                        : "border-border-default hover:border-primary-200 hover:bg-primary-50 bg-white"
                    )}
                  >
                    <p className="font-medium">{point.name}</p>
                    <p className="text-text-muted text-sm">
                      {point.address}
                      {point.city ? `, ${point.city}` : ""}
                    </p>
                  </button>
                ))}
              </div>
              {errors.origin_pickup_point_id?.message && (
                <p role="alert" className="text-error text-sm">
                  {tv(errors.origin_pickup_point_id.message.replace("validation.", ""))}
                </p>
              )}
            </div>
          )}

          {/* Hidden registered field */}
          <input type="hidden" {...register("origin_pickup_point_id")} />
        </CardBody>
      </CardShell>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          {t("back")}
        </Button>
        <Button type="submit" variant="primary">
          {t("next")}
        </Button>
      </div>
    </form>
  );
}
