"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Input, Label } from "@/components/atoms";
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
  name: z.string().min(2),
  address: z.string().min(5),
  postcode: z.string().min(4).max(10),
  city: z.string().min(2),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  working_hours: workingHoursSchema.optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  pickupPointId?: string; // undefined = create mode
};

export function AdminPickupPointFormSection({ pickupPointId }: Props) {
  const t = useTranslations("adminPickupPoints");
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
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-body text-2xl font-semibold text-gray-900">
          {isEditMode ? t("editPickupPoint") : t("createPickupPoint")}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="max-w-2xl space-y-6"
      >
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <Field label={t("name")} error={errors.name?.message}>
            <Input {...register("name")} hasError={!!errors.name} />
          </Field>

          <Field label={t("address")} error={errors.address?.message}>
            <Input {...register("address")} hasError={!!errors.address} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("postcode")} error={errors.postcode?.message}>
              <Input {...register("postcode")} hasError={!!errors.postcode} />
            </Field>
            <Field label={t("city")} error={errors.city?.message}>
              <Input {...register("city")} hasError={!!errors.city} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("latitude")} error={errors.latitude?.message}>
              <Input
                type="number"
                step="any"
                {...register("latitude")}
                hasError={!!errors.latitude}
              />
            </Field>
            <Field label={t("longitude")} error={errors.longitude?.message}>
              <Input
                type="number"
                step="any"
                {...register("longitude")}
                hasError={!!errors.longitude}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("phone")}>
              <Input {...register("phone")} />
            </Field>
            <Field label={t("email")} error={errors.email?.message}>
              <Input type="email" {...register("email")} hasError={!!errors.email} />
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("workingHours")}</h2>
          <WorkingHoursEditor
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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
    </div>
  );
}
