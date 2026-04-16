"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, Input, Label } from "@/components/atoms";
import { WorkingHoursEditor } from "@/components/molecules";
import { usePickupPointId } from "@/hooks/use-pickup-point-id";
import { usePickupPoint } from "@/hooks/use-pickup-points";
import { cn } from "@/lib/utils";
import type { WorkingHours } from "@/validations/pickup-point.schema";
import { DEFAULT_WORKING_HOURS, parseWorkingHours } from "@/validations/pickup-point.schema";

export function PickupPointSettingsSection() {
  const t = useTranslations("pickupPointSettings");
  const queryClient = useQueryClient();
  const { data: pickupPointId } = usePickupPointId();
  const { data: pickupPoint, isLoading } = usePickupPoint(pickupPointId ?? undefined);

  const [isOpen, setIsOpen] = useState(true);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);

  useEffect(() => {
    if (pickupPoint) {
      setIsOpen(pickupPoint.is_open ?? true);
      setWorkingHours(parseWorkingHours(pickupPoint.working_hours));
    }
  }, [pickupPoint]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pickupPointId) throw new Error("No pickup point");

      const response = await fetch(`/api/pickup-points/${pickupPointId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_open: isOpen,
          working_hours: workingHours,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-point", pickupPointId] });
      toast.success(t("saved"));
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  if (isLoading || !pickupPoint) {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-8 w-48 rounded" />
        <div className="skeleton-shimmer border-border-default bg-bg-secondary h-64 rounded-xl border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <section className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary text-base font-semibold">{t("availability")}</h2>
          <p className="text-text-muted mt-1 text-xs">{t("availabilityDesc")}</p>

          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="mt-4 flex items-center gap-3"
          >
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                isOpen ? "bg-success" : "bg-secondary-50"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  isOpen ? "translate-x-5.5" : "translate-x-0.5"
                )}
              />
            </div>
            <span
              className={cn("text-sm font-medium", isOpen ? "text-success" : "text-text-muted")}
            >
              {isOpen ? t("shopOpen") : t("shopClosed")}
            </span>
          </button>
          {!isOpen && <p className="text-warning mt-2 text-xs">{t("manualOverrideWarning")}</p>}
        </section>

        <section className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <div>
            <h2 className="text-text-primary text-base font-semibold">{t("contactInfo")}</h2>
            <p className="text-text-muted mt-1 text-xs">{t("contactInfoDesc")}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-sm font-medium">{t("phone")}</Label>
              <Input
                value={pickupPoint.phone ?? "-"}
                readOnly
                className="bg-bg-muted text-text-muted cursor-not-allowed py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-text-secondary text-sm font-medium">{t("email")}</Label>
              <Input
                value={pickupPoint.email ?? "-"}
                readOnly
                className="bg-bg-muted text-text-muted cursor-not-allowed py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="border-border-default space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-text-primary text-base font-semibold">{t("workingHours")}</h2>

          <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} t={t} />
        </section>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
