"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Input, Label } from "@/components/atoms";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { cn } from "@/lib/utils";
import { getDeliveryMode } from "@/services/routing.service";
import {
  bookingStepDestinationSchema,
  type BookingStepDestinationInput,
} from "@/validations/shipment.schema";

export function Step3Destination() {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");
  const { destination, origin, setDestination, setStep, setDeliveryMode } = useBookingStore();

  const [postcodeInput, setPostcodeInput] = useState(destination?.destination_postcode ?? "");
  const [searchPostcode, setSearchPostcode] = useState(destination?.destination_postcode ?? "");

  const { data: pickupPoints, isFetching } = usePickupPoints(
    searchPostcode.length === 5 ? searchPostcode : undefined
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingStepDestinationInput>({
    resolver: zodResolver(bookingStepDestinationSchema),
    defaultValues: destination ?? undefined,
  });

  const selectedPointId = watch("destination_pickup_point_id");

  function onSubmit(data: BookingStepDestinationInput) {
    // Detect delivery mode from postcodes using the shared routing service
    const originPostcode = origin?.origin_postcode ?? "";
    const routing = getDeliveryMode(originPostcode, data.destination_postcode);
    if (routing.mode !== "blocked") {
      setDeliveryMode(routing.mode);
    }
    setDestination(data);
  }

  function handlePostcodeSearch() {
    if (/^[0-9]{5}$/.test(postcodeInput)) {
      setSearchPostcode(postcodeInput);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <CardShell>
        <CardHeader title={t("stepDestination")} />
        <CardBody className="space-y-4">
          <input type="hidden" {...register("destination_postcode")} value={postcodeInput} />

          {/* Postcode search */}
          <div className="space-y-1.5">
            <Label htmlFor="destination_postcode">{t("destinationPostcode")}</Label>
            <div className="flex gap-2">
              <Input
                id="destination_postcode"
                type="text"
                placeholder={t("postcodePlaceholder")}
                maxLength={5}
                value={postcodeInput}
                onChange={(e) => {
                  setPostcodeInput(e.target.value);
                  setValue("destination_postcode", e.target.value);
                }}
                hasError={!!errors.destination_postcode}
                aria-invalid={!!errors.destination_postcode}
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
            {errors.destination_postcode?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.destination_postcode.message.replace("validation.", ""))}
              </p>
            )}
          </div>

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
                      setValue("destination_pickup_point_id", point.id, { shouldValidate: true })
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
              {errors.destination_pickup_point_id?.message && (
                <p role="alert" className="text-error text-sm">
                  {tv(errors.destination_pickup_point_id.message.replace("validation.", ""))}
                </p>
              )}
            </div>
          )}

          <input type="hidden" {...register("destination_pickup_point_id")} />
        </CardBody>
      </CardShell>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => setStep(2)}>
          {t("back")}
        </Button>
        <Button type="submit" variant="primary">
          {t("next")}
        </Button>
      </div>
    </form>
  );
}
