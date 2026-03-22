"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
      <CardShell>
        <CardHeader title={t("senderSection")} />
        <CardBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sender_name">{t("senderName")}</Label>
            <Input
              id="sender_name"
              type="text"
              placeholder={t("senderNamePlaceholder")}
              hasError={!!errors.sender_name}
              aria-invalid={!!errors.sender_name}
              {...register("sender_name")}
            />
            {errors.sender_name?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.sender_name.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sender_phone">{t("senderPhone")}</Label>
            <Input
              id="sender_phone"
              type="tel"
              placeholder={t("phonePlaceholder")}
              hasError={!!errors.sender_phone}
              aria-invalid={!!errors.sender_phone}
              {...register("sender_phone")}
            />
            {errors.sender_phone?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.sender_phone.message.replace("validation.", ""))}
              </p>
            )}
          </div>
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader title={t("receiverSection")} />
        <CardBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="receiver_name">{t("receiverName")}</Label>
            <Input
              id="receiver_name"
              type="text"
              placeholder={t("receiverNamePlaceholder")}
              hasError={!!errors.receiver_name}
              aria-invalid={!!errors.receiver_name}
              {...register("receiver_name")}
            />
            {errors.receiver_name?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.receiver_name.message.replace("validation.", ""))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receiver_phone">{t("receiverPhone")}</Label>
            <Input
              id="receiver_phone"
              type="tel"
              placeholder={t("phonePlaceholder")}
              hasError={!!errors.receiver_phone}
              aria-invalid={!!errors.receiver_phone}
              {...register("receiver_phone")}
            />
            {errors.receiver_phone?.message && (
              <p role="alert" className="text-error text-sm">
                {tv(errors.receiver_phone.message.replace("validation.", ""))}
              </p>
            )}
          </div>
        </CardBody>
      </CardShell>

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {t("next")}
        </Button>
      </div>
    </form>
  );
}
