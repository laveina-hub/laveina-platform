"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Phone, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button, CardBody, CardHeader, CardShell, Input, Label } from "@/components/atoms";
import { useBookingStore } from "@/hooks/use-booking-store";
import {
  bookingStepContactSchema,
  type BookingStepContactInput,
} from "@/validations/shipment.schema";

export function Step1Contact() {
  const t = useTranslations("booking");
  const tv = useTranslations("validation");
  const { contact, setContact } = useBookingStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingStepContactInput>({
    resolver: zodResolver(bookingStepContactSchema),
    defaultValues: contact ?? undefined,
  });

  function onSubmit(data: BookingStepContactInput) {
    setContact(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <CardShell className="animate-fade-in-up border-border-muted border shadow-md transition-shadow hover:shadow-lg">
        <CardHeader title={t("senderSection")} />
        <CardBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="sender_name">{t("senderName")}</Label>
            <div className="relative">
              <span className="text-text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <User className="h-4 w-4" />
              </span>
              <Input
                id="sender_name"
                type="text"
                placeholder={t("senderNamePlaceholder")}
                hasError={!!errors.sender_name}
                aria-invalid={!!errors.sender_name}
                className="pl-10"
                {...register("sender_name")}
              />
            </div>
            {errors.sender_name?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.sender_name.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sender_phone">{t("senderPhone")}</Label>
            <div className="relative">
              <span className="text-text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <Phone className="h-4 w-4" />
              </span>
              <Input
                id="sender_phone"
                type="tel"
                placeholder={t("phonePlaceholder")}
                hasError={!!errors.sender_phone}
                aria-invalid={!!errors.sender_phone}
                className="pl-10"
                {...register("sender_phone")}
              />
            </div>
            {errors.sender_phone?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.sender_phone.message.replace("validation.", ""))}
              </p>
            )}
          </div>
        </CardBody>
      </CardShell>

      <CardShell className="animate-fade-in-up border-border-muted border shadow-md transition-shadow [animation-delay:100ms] hover:shadow-lg">
        <CardHeader title={t("receiverSection")} />
        <CardBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="receiver_name">{t("receiverName")}</Label>
            <div className="relative">
              <span className="text-text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <User className="h-4 w-4" />
              </span>
              <Input
                id="receiver_name"
                type="text"
                placeholder={t("receiverNamePlaceholder")}
                hasError={!!errors.receiver_name}
                aria-invalid={!!errors.receiver_name}
                className="pl-10"
                {...register("receiver_name")}
              />
            </div>
            {errors.receiver_name?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.receiver_name.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receiver_phone">{t("receiverPhone")}</Label>
            <div className="relative">
              <span className="text-text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
                <Phone className="h-4 w-4" />
              </span>
              <Input
                id="receiver_phone"
                type="tel"
                placeholder={t("phonePlaceholder")}
                hasError={!!errors.receiver_phone}
                aria-invalid={!!errors.receiver_phone}
                className="pl-10"
                {...register("receiver_phone")}
              />
            </div>
            {errors.receiver_phone?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.receiver_phone.message.replace("validation.", ""))}
              </p>
            )}
          </div>
        </CardBody>
      </CardShell>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="lg" className="group gap-2">
          {t("next")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </form>
  );
}
