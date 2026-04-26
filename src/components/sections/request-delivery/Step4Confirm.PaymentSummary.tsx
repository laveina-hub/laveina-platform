"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/atoms";
import { LockIcon } from "@/components/icons";
import { formatCents } from "@/lib/format";

import { MastercardBadge, PriceRow, StripeBadge, VisaBadge } from "./Step4Confirm.Helpers";

// Q15.2 totals strip + Stripe checkout button. Extracted from `Step4Confirm`
// so the parent file stays under the 250-line cap.

type Props = {
  deliveryCents: number;
  insuranceTotalCents: number;
  subtotalCents: number;
  vatCents: number;
  grandTotalCents: number;
  canPay: boolean;
  onPay: () => void;
};

export function Step4PaymentSummary({
  deliveryCents,
  insuranceTotalCents,
  subtotalCents,
  vatCents,
  grandTotalCents,
  canPay,
  onPay,
}: Props) {
  const t = useTranslations("booking");

  return (
    <section className="border-border-muted flex flex-col gap-4 rounded-2xl border bg-white p-5">
      {/* Q15.2 — Delivery (ex-VAT) → Insurance (ex-VAT) → Subtotal → VAT → Total. */}
      <dl className="flex flex-col gap-3 text-sm">
        <PriceRow
          label={t("priceDelivery")}
          value={deliveryCents > 0 ? formatCents(deliveryCents) : "—"}
        />
        {insuranceTotalCents > 0 && (
          <PriceRow label={t("priceInsurance")} value={formatCents(insuranceTotalCents)} />
        )}
        <div className="border-border-muted border-t pt-3">
          <PriceRow
            label={t("priceSubtotal")}
            value={subtotalCents > 0 ? formatCents(subtotalCents) : "—"}
          />
        </div>
        <PriceRow label={t("priceVat")} value={subtotalCents > 0 ? formatCents(vatCents) : "—"} />
      </dl>

      <div className="bg-primary-50/70 rounded-xl px-4 py-3">
        <p className="text-text-muted text-right text-xs font-medium">{t("priceTotal")}</p>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="text-text-primary text-sm font-medium">{t("priceLine")}</span>
          <span className="text-text-primary text-sm font-semibold tabular-nums">
            {grandTotalCents > 0
              ? t("priceCurrency", { amount: (grandTotalCents / 100).toFixed(2) })
              : "—"}
          </span>
        </div>
      </div>

      <p className="text-text-muted inline-flex items-center gap-2 text-xs">
        <LockIcon className="h-4 w-4" aria-hidden />
        {t("securePaymentNote")}
      </p>

      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={onPay}
        disabled={!canPay}
        className="w-full"
      >
        {grandTotalCents > 0
          ? t("payButton", { price: formatCents(grandTotalCents) })
          : t("payButton", { price: "—" })}
      </Button>

      {/* Q17.1 — make the auto-save behaviour visible. The booking store
          persists every change to localStorage via Zustand `persist`, so
          closing the tab here doesn't lose anything; users tend to assume
          otherwise without this reassurance copy. */}
      <p className="text-text-muted text-center text-xs">{t("draftAutoSaved")}</p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <StripeBadge />
        <VisaBadge />
        <MastercardBadge />
      </div>
    </section>
  );
}
