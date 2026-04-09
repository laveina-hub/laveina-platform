"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, MapPin, Search } from "lucide-react";
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
      <CardShell className="animate-fade-in-up border-border-muted border shadow-md transition-shadow hover:shadow-lg">
        <CardHeader title={t("stepDestination")} />
        <CardBody className="space-y-5">
          <input type="hidden" {...register("destination_postcode")} value={postcodeInput} />

          <div className="space-y-1.5">
            <Label htmlFor="destination_postcode">{t("destinationPostcode")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="text-text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                  <MapPin className="h-4 w-4" />
                </span>
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
                  className="pl-10"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePostcodeSearch}
                disabled={postcodeInput.length !== 5}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{t("searchPickupPoints")}</span>
              </Button>
            </div>
            {errors.destination_postcode?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.destination_postcode.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          {isFetching && (
            <div className="flex items-center gap-2 py-4">
              <div className="border-primary-500 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              <p className="text-text-muted text-sm">{t("searchingPickupPoints")}</p>
            </div>
          )}

          {!isFetching && pickupPoints && pickupPoints.length === 0 && searchPostcode && (
            <p className="text-text-muted animate-fade-in py-4 text-center text-sm">
              {t("noPickupPoints")}
            </p>
          )}

          {pickupPoints && pickupPoints.length > 0 && (
            <div className="animate-fade-in space-y-3">
              <Label>{t("selectPickupPoint")}</Label>
              <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto pr-1">
                {pickupPoints.map((point, idx) => (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() =>
                      setValue("destination_pickup_point_id", point.id, { shouldValidate: true })
                    }
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className={cn(
                      "animate-fade-in-up rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none",
                      selectedPointId === point.id
                        ? "border-primary-400 bg-primary-50 shadow-primary-500/10 shadow-md"
                        : "bg-bg-secondary hover:border-primary-200 hover:bg-primary-50 border-transparent hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          selectedPointId === point.id
                            ? "bg-primary-500 text-white"
                            : "bg-primary-100 text-primary-600"
                        )}
                      >
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{point.name}</p>
                        <p className="text-text-muted text-sm">
                          {point.address}
                          {point.city ? `, ${point.city}` : ""}
                        </p>
                      </div>
                    </div>
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

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setStep(2)}
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
