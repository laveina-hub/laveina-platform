"use client";

import { useTranslations } from "next-intl";

import { CardHeader, CardShell, Divider } from "@/components/atoms";

interface PricingSummaryCardProps {
  estimatedCost?: string;
  taxAndFees?: string;
  total?: string;
  className?: string;
}

/** Pricing summary card — shows cost breakdown and total. */
export function PricingSummaryCard({
  estimatedCost = "$250",
  taxAndFees = "$30",
  total = "$280",
  className,
}: PricingSummaryCardProps) {
  const t = useTranslations("requestDelivery");

  const lines = [
    { label: t("estimatedCost"), amount: estimatedCost },
    { label: t("taxAndFees"), amount: taxAndFees },
  ];

  return (
    <CardShell className={className}>
      <CardHeader title={t("pricingSummary")} />

      <div className="space-y-3 p-6 sm:p-10">
        {lines.map(({ label, amount }) => (
          <div key={label} className="flex items-center justify-between gap-24">
            <span className="text-text-muted shrink-0 text-base font-medium sm:w-40 sm:text-xl">
              {label}
            </span>
            <span className="text-text-muted text-base font-semibold sm:text-xl">{amount}</span>
          </div>
        ))}
      </div>

      <Divider className="mx-6 sm:mx-10" />

      <div className="flex items-center justify-between p-6 sm:px-10 sm:py-8">
        <span className="text-text-muted text-xl font-medium sm:text-2xl">{t("total")}</span>
        <span className="text-text-muted text-xl font-bold sm:text-2xl">{total}</span>
      </div>
    </CardShell>
  );
}
