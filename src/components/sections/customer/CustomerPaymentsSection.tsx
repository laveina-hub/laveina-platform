"use client";

import { CreditCard } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CardBody, CardShell } from "@/components/atoms";
import { DownloadIcon, PackageIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { formatCents, formatDateLong, type Locale } from "@/lib/format";
import type { PaymentRow } from "@/services/invoice.service";

// "Payments & Invoices" — each row = one Stripe session (one customer-facing
// payment). Click opens the printable invoice in a new tab so the browser's
// native print-to-PDF dialog is reachable without leaving the dashboard.

type Props = {
  payments: PaymentRow[];
};

export function CustomerPaymentsSection({ payments }: Props) {
  const t = useTranslations("customerPayments");
  const locale = useLocale() as Locale;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </header>

      {payments.length === 0 ? (
        <CardShell>
          <CardBody className="flex flex-col items-center gap-3 text-center">
            <CreditCard className="text-text-muted" size={28} />
            <div>
              <p className="text-text-primary font-medium">{t("emptyTitle")}</p>
              <p className="text-text-muted text-sm">{t("emptySubtitle")}</p>
            </div>
          </CardBody>
        </CardShell>
      ) : (
        <ul className="flex flex-col gap-3">
          {payments.map((payment) => (
            <li key={payment.stripe_checkout_session_id}>
              <CardShell>
                <CardBody className="flex flex-wrap items-center justify-between gap-3 px-5! py-4!">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-primary-50 text-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <PackageIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary text-sm font-semibold">
                        {formatDateLong(payment.payment_date, locale)}
                      </p>
                      <p className="text-text-muted text-xs">
                        {payment.parcel_count > 1
                          ? t("rowMulti", {
                              count: payment.parcel_count,
                              tracking: payment.tracking_ids[0],
                            })
                          : t("rowSingle", { tracking: payment.tracking_ids[0] })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-text-primary text-sm font-semibold tabular-nums">
                      {formatCents(payment.total_cents)}
                    </span>
                    <Link
                      href={`/invoice/${payment.stripe_checkout_session_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-primary-600 inline-flex items-center gap-1 text-sm font-medium"
                    >
                      {t("viewInvoice")}
                    </Link>
                    <a
                      href={`/api/invoices/${payment.stripe_checkout_session_id}`}
                      className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-sm font-medium"
                    >
                      <DownloadIcon size={14} />
                      {t("downloadInvoice")}
                    </a>
                  </div>
                </CardBody>
              </CardShell>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
