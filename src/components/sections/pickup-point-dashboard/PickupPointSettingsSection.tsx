"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, Input, Label } from "@/components/atoms";
import { usePickupPointId } from "@/hooks/use-pickup-point-id";
import { usePickupPoint } from "@/hooks/use-pickup-points";
import { cn } from "@/lib/utils";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function PickupPointSettingsSection() {
  const t = useTranslations("pickupPointSettings");
  const queryClient = useQueryClient();
  const { data: pickupPointId } = usePickupPointId();
  const { data: pickupPoint, isLoading } = usePickupPoint(pickupPointId ?? undefined);

  const [isOpen, setIsOpen] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [workingHours, setWorkingHours] = useState<Record<string, string>>({});

  useEffect(() => {
    if (pickupPoint) {
      setIsOpen(pickupPoint.is_open ?? true);
      setPhone(pickupPoint.phone ?? "");
      setEmail(pickupPoint.email ?? "");
      // SAFETY: working_hours is stored as a JSON object of {day: hours_string} in Supabase
      setWorkingHours((pickupPoint.working_hours as Record<string, string>) ?? {});
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
          phone,
          email: email || undefined,
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
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Availability toggle */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("availability")}</h2>
          <p className="mt-1 text-xs text-gray-500">{t("availabilityDesc")}</p>

          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="mt-4 flex items-center gap-3"
          >
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                isOpen ? "bg-green-500" : "bg-gray-300"
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
              className={cn("text-sm font-medium", isOpen ? "text-green-700" : "text-gray-500")}
            >
              {isOpen ? t("shopOpen") : t("shopClosed")}
            </span>
          </button>
        </section>

        {/* Contact info */}
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("contactInfo")}</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">{t("phone")}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">{t("email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Working hours */}
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">{t("workingHours")}</h2>

          <div className="space-y-3">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <Label className="w-28 shrink-0 text-sm text-gray-600">{t(day)}</Label>
                <Input
                  value={workingHours[day] ?? ""}
                  onChange={(e) => setWorkingHours((prev) => ({ ...prev, [day]: e.target.value }))}
                  placeholder={t("closed")}
                  className="py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
