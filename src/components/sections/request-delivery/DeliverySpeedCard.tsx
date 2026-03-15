"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, CardHeader, CardShell } from "@/components/atoms";
import { CheckIcon } from "@/components/icons";
import { IconBadge } from "@/components/molecules";
import { cn } from "@/lib/utils";

type SpeedOption = "standard" | "express" | "same-day";

const SPEED_OPTION_IDS: SpeedOption[] = ["standard", "express", "same-day"];

const SPEED_OPTION_KEYS: Record<SpeedOption, string> = {
  standard: "standard",
  express: "express",
  "same-day": "sameDay",
};

interface DeliverySpeedCardProps {
  onConfirm?: () => void;
  className?: string;
}

export function DeliverySpeedCard({ onConfirm, className }: DeliverySpeedCardProps) {
  const t = useTranslations("requestDelivery");
  const [selected, setSelected] = useState<SpeedOption>("standard");

  return (
    <CardShell className={className}>
      <CardHeader title={t("deliverySpeed")} />

      <div className="space-y-6 px-7 pt-4 pb-7 sm:px-9 sm:pt-7 sm:pb-14">
        <div className="flex flex-col gap-3 sm:flex-row">
          {SPEED_OPTION_IDS.map((id) => {
            const isSelected = selected === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-5 text-2xl font-medium transition-colors focus:outline-none",
                  isSelected
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-border-default text-text-secondary hover:border-primary-200 hover:bg-primary-50 bg-white"
                )}
              >
                <IconBadge size="sm" className="h-auto w-auto p-2.5">
                  <CheckIcon size={20} color="#0192FF" />
                </IconBadge>
                <div className="w-full max-w-32">{t(SPEED_OPTION_KEYS[id])}</div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button variant="primary" size="lg" onClick={onConfirm} className="rounded-2xl">
            {t("confirmDeliveryRequest")}
          </Button>
        </div>
      </div>
    </CardShell>
  );
}
