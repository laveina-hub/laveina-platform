"use client";

import { Clock, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { PriceBreakdown } from "@/types/shipment";
import type { CreateCheckoutInput } from "@/validations/shipment.schema";

export function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export async function fetchRates(params: {
  origin_postcode: string;
  destination_postcode: string;
  parcels: Array<{
    weight_kg: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    insurance_option_id: string | null;
  }>;
}): Promise<PriceBreakdown[]> {
  const res = await fetch("/api/shipments/get-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? "Failed to get rates");
  }
  const json = await res.json();
  return json.data;
}

export async function createCheckout(payload: CreateCheckoutInput): Promise<string> {
  const res = await fetch("/api/shipments/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? "Failed to create checkout");
  }
  const json = await res.json();
  return json.data.url;
}

export function PriceOptionCard({
  speedKey,
  totalCents,
  estimatedDays,
  selected,
  onSelect,
  t,
}: {
  speedKey: "standard" | "express";
  totalCents: number;
  estimatedDays: string | null;
  selected: boolean;
  onSelect: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const labelKey = speedKey === "express" ? "deliveryExpress" : "deliveryStandard";
  const isExpress = speedKey === "express";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-1 flex-col rounded-xl border-2 p-5 text-left transition-all duration-200 focus:outline-none",
        selected
          ? "border-primary-400 bg-primary-50 shadow-primary-500/10 shadow-md"
          : "border-border-default hover:border-primary-200 hover:bg-primary-50 bg-white hover:shadow-sm"
      )}
    >
      {/* Selected indicator */}
      <div
        className={cn(
          "absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-primary-500 bg-primary-500" : "border-border-default bg-white"
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            isExpress
              ? selected
                ? "bg-tertiary-50 text-white"
                : "bg-orange-100 text-orange-600"
              : selected
                ? "bg-primary-500 text-white"
                : "bg-primary-100 text-primary-600"
          )}
        >
          {isExpress ? <Zap className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        </div>
        <span className="text-lg font-semibold">{t(labelKey)}</span>
      </div>

      {estimatedDays && (
        <span className="text-text-muted mt-1 text-sm">
          {t("estimatedDays", { days: estimatedDays })}
        </span>
      )}

      <span className="text-primary-700 mt-3 text-2xl font-bold">{formatCents(totalCents)}</span>
      <span className="text-text-muted text-xs">{t("iva")}</span>
    </button>
  );
}

export type PriceSummary = {
  shippingCents: number;
  insuranceSurchargeCents: number;
  ivaCents: number;
  totalCents: number;
  available: boolean;
};

export function sumOption(
  breakdowns: PriceBreakdown[],
  speed: "standard" | "express"
): PriceSummary {
  let shipping = 0;
  let insurance = 0;
  let iva = 0;
  let total = 0;
  let available = true;

  for (const b of breakdowns) {
    const opt = speed === "express" && b.express ? b.express : b.standard;
    if (speed === "express" && !b.express) available = false;
    shipping += opt.shippingCents;
    insurance += opt.insuranceSurchargeCents;
    iva += opt.ivaCents;
    total += opt.totalCents;
  }

  return {
    shippingCents: shipping,
    insuranceSurchargeCents: insurance,
    ivaCents: iva,
    totalCents: total,
    available,
  };
}
