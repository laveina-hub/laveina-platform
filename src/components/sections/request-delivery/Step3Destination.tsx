"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Label } from "@/components/atoms";
import { useBookingStore } from "@/hooks/use-booking-store";
import { usePickupPoints } from "@/hooks/use-pickup-points";
import { cn } from "@/lib/utils";
import { getDeliveryMode } from "@/services/routing.service";
import {
  bookingStepDestinationSchema,
  type BookingStepDestinationInput,
} from "@/validations/shipment.schema";

const PostcodeSearch = dynamic(
  () => import("@/components/molecules/PostcodeSearch").then((mod) => mod.PostcodeSearch),
  { ssr: false, loading: () => <div className="bg-bg-secondary h-10 animate-pulse rounded-lg" /> }
);

const PickupPointMap = dynamic(
  () => import("@/components/molecules/PickupPointMap").then((mod) => mod.PickupPointMap),
  { ssr: false, loading: () => <div className="bg-primary-50 h-64 animate-pulse rounded-xl" /> }
);

export function Step3Destination() {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");
  const { destination, origin, setDestination, setStep, setDeliveryMode } = useBookingStore();

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

  const handlePostcodeResolved = useCallback(
    (postcode: string) => {
      setValue("destination_postcode", postcode, { shouldValidate: true });
      setSearchPostcode(postcode);
    },
    [setValue]
  );

  const handleSelectPoint = useCallback(
    (id: string) => {
      setValue("destination_pickup_point_id", id, { shouldValidate: true });
    },
    [setValue]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <CardShell className="animate-fade-in-up border-border-muted border shadow-md transition-shadow hover:shadow-lg">
        <CardHeader title={t("stepDestination")} />
        <CardBody className="space-y-5">
          <input type="hidden" {...register("destination_postcode")} />

          <div className="space-y-1.5">
            <Label htmlFor="destination_search">{t("destinationPostcode")}</Label>
            <PostcodeSearch
              id="destination_search"
              placeholder={t("postcodeSearchPlaceholder")}
              searchLabel={t("searchPickupPoints")}
              defaultValue={destination?.destination_postcode ?? ""}
              hasError={!!errors.destination_postcode}
              errorId={errors.destination_postcode ? "destination_postcode_error" : undefined}
              onPostcodeResolved={handlePostcodeResolved}
            />
            {errors.destination_postcode?.message && (
              <p id="destination_postcode_error" role="alert" className="text-error text-sm">
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
              {/* Count indicator */}
              <div className="flex items-center justify-between">
                <Label>{t("selectPickupPoint")}</Label>
                <span className="bg-primary-100 text-primary-700 rounded-full px-3 py-0.5 text-xs font-medium">
                  {t("pickupPointsFound", { count: pickupPoints.length })}
                </span>
              </div>

              {/* Side-by-side: map + cards on desktop, stacked on mobile */}
              <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
                {/* Map — sticky on desktop */}
                <div className="lg:sticky lg:top-4 lg:h-96 lg:w-3/5 lg:shrink-0">
                  <PickupPointMap
                    pickupPoints={pickupPoints}
                    selectedPointId={selectedPointId}
                    onSelectPoint={handleSelectPoint}
                    className="h-72 lg:h-full"
                  />
                </div>

                {/* Card list */}
                <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto pr-1 lg:w-2/5">
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
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium">{point.name}</p>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                                point.is_open
                                  ? "bg-success-100 text-success-700"
                                  : "bg-error-100 text-error-700"
                              )}
                            >
                              {point.is_open ? t("open") : t("closed")}
                            </span>
                          </div>
                          <p className="text-text-muted truncate text-sm">
                            {point.address}
                            {point.city ? `, ${point.city}` : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
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
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => setStep(2)}
          className="group gap-2"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          {t("back")}
        </Button>
        <Button type="submit" variant="primary" size="md" className="group gap-2">
          {t("next")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </form>
  );
}
