"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Input, Label } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { WorkingHoursEditor } from "@/components/molecules";
import { usePickupPoint } from "@/hooks/use-pickup-points";
import { Link, useRouter } from "@/i18n/navigation";
import type { WorkingHours } from "@/validations/pickup-point.schema";
import {
  DEFAULT_WORKING_HOURS,
  parseWorkingHours,
  workingHoursSchema,
} from "@/validations/pickup-point.schema";

const formSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  postcode: z.string().regex(/^[0-9]{5}$/, "validation.postcodeInvalid"),
  city: z.string().min(2).max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-]{9,15}$/, "validation.phoneInvalid")
    .optional()
    .or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  working_hours: workingHoursSchema.optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  pickupPointId?: string; // undefined = create mode
};

export function AdminPickupPointFormSection({ pickupPointId }: Props) {
  const t = useTranslations("adminPickupPoints");
  const tv = useTranslations("validation");
  const router = useRouter();
  const isEditMode = !!pickupPointId;
  const { data: pickupPoint, isLoading } = usePickupPoint(pickupPointId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      working_hours: DEFAULT_WORKING_HOURS,
    },
  });

  useEffect(() => {
    if (!pickupPoint) return;
    setValue("name", pickupPoint.name);
    setValue("address", pickupPoint.address);
    setValue("postcode", pickupPoint.postcode);
    setValue("city", pickupPoint.city ?? "");
    setValue("latitude", pickupPoint.latitude ?? 0);
    setValue("longitude", pickupPoint.longitude ?? 0);
    setValue("phone", pickupPoint.phone ?? "");
    setValue("email", pickupPoint.email ?? "");
    setValue("working_hours", parseWorkingHours(pickupPoint.working_hours));
  }, [pickupPoint, setValue]);

  const workingHours = watch("working_hours") ?? DEFAULT_WORKING_HOURS;

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const url = isEditMode ? `/api/pickup-points/${pickupPointId}` : "/api/pickup-points";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? "Failed to save");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(isEditMode ? t("saved") : t("created"));
      router.push("/admin/pickup-points");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isEditMode && isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/pickup-points"
          className="text-text-muted hover:bg-bg-muted hover:text-text-light rounded-lg p-2"
        >
          <ChevronIcon size={20} />
        </Link>
        <h1 className="font-body text-text-primary text-2xl font-semibold">
          {isEditMode ? t("editPickupPoint") : t("createPickupPoint")}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="max-w-2xl space-y-6"
      >
        <div className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <Field label={t("name")} error={errors.name?.message} tv={tv}>
            <Input {...register("name")} hasError={!!errors.name} />
          </Field>

          <Field label={t("address")} error={errors.address?.message} tv={tv}>
            <Input {...register("address")} hasError={!!errors.address} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("postcode")} error={errors.postcode?.message} tv={tv}>
              <Input {...register("postcode")} hasError={!!errors.postcode} />
            </Field>
            <Field label={t("city")} error={errors.city?.message} tv={tv}>
              <Input {...register("city")} hasError={!!errors.city} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("latitude")} error={errors.latitude?.message} tv={tv}>
              <Input
                type="number"
                step="any"
                {...register("latitude")}
                hasError={!!errors.latitude}
              />
            </Field>
            <Field label={t("longitude")} error={errors.longitude?.message} tv={tv}>
              <Input
                type="number"
                step="any"
                {...register("longitude")}
                hasError={!!errors.longitude}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("phone")} error={errors.phone?.message} tv={tv}>
              <Input {...register("phone")} hasError={!!errors.phone} />
            </Field>
            <Field label={t("email")} error={errors.email?.message} tv={tv}>
              <Input type="email" {...register("email")} hasError={!!errors.email} />
            </Field>
          </div>
        </div>

        <div className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-text-primary text-base font-semibold">{t("workingHours")}</h2>
          <WorkingHoursEditor
            // SAFETY: workingHours from form state is validated against WorkingHours schema on submit
            value={workingHours as WorkingHours}
            onChange={(hours) => setValue("working_hours", hours)}
            t={t}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
            {isEditMode ? t("save") : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  tv,
  children,
}: {
  label: string;
  error?: string;
  tv?: (key: string) => string;
  children: React.ReactNode;
}) {
  const errorText =
    error && tv && error.startsWith("validation.") ? tv(error.replace("validation.", "")) : error;

  return (
    <div className="space-y-1.5">
      <Label className="text-text-secondary text-sm font-medium">{label}</Label>
      {children}
      {errorText && <p className="text-xs text-red-500">{errorText}</p>}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer h-8 w-64 rounded" />
      <div className="skeleton-shimmer border-border-default bg-bg-secondary h-96 rounded-xl border" />
    </div>
  );
}
