"use client";

import { Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/atoms";
import { formatCents, formatDateLong, type Locale } from "@/lib/format";
import type { InvoiceData } from "@/services/invoice.service";

// C5 (client answer 2026-04-21): Laveina Tech legal block for customer-
// facing invoices. Hard-coded here because it's a single-tenant value and
// putting it in admin_settings would require a dashboard round-trip for
// every invoice render.
const SELLER = {
  name: "LAVEINA TECH, SOCIEDAD LIMITADA",
  nif: "B70881610",
  addressLine1: "C/ Rambla de l'Exposició, 103, Planta 1",
  addressLine2: "08800 Vilanova i la Geltrú, Barcelona, España",
  phone: "+34 934 652 923",
  email: "info@laveina.co",
} as const;

const IVA_RATE = 0.21;

type Props = {
  invoice: InvoiceData;
};

export function CustomerInvoiceView({ invoice }: Props) {
  const t = useTranslations("customerInvoice");
  const locale = useLocale() as Locale;

  // Totals per Q15.2:
  //   Subtotal = Delivery + Insurance  (both ex-VAT)
  //   VAT      = 21% × Subtotal
  //   Total    = Subtotal + VAT       (= stored price_cents per parcel)
  // `shipment.price_cents` already includes VAT + insurance; derive the split
  // backwards so the customer sees the explicit ex-VAT breakdown.
  const totalCents = invoice.shipments.reduce((sum, s) => sum + s.price_cents, 0);
  const insuranceCents = invoice.shipments.reduce((sum, s) => sum + s.insurance_surcharge_cents, 0);
  const subtotalCents = Math.round(totalCents / (1 + IVA_RATE));
  const vatCents = totalCents - subtotalCents;
  const deliveryCents = subtotalCents - insuranceCents;

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <main className="text-text-primary min-h-screen bg-white print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="border-border-muted sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-6 py-3 print:hidden">
        <div>
          <p className="text-text-muted text-xs">{t("toolbarInvoiceLabel")}</p>
          <p className="text-text-primary text-sm font-semibold tabular-nums">
            {invoice.invoice_number}
          </p>
        </div>
        <Button size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          {t("print")}
        </Button>
      </div>

      {/* Invoice — visible on screen + print */}
      <article className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-14 print:px-0 print:py-4">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-text-primary text-3xl leading-tight font-bold">
              {t("title")}
            </h1>
            <p className="text-text-muted mt-1 text-sm">
              {t("number", { value: invoice.invoice_number })}
            </p>
            <p className="text-text-muted text-sm">
              {t("issuedOn", { date: formatDateLong(invoice.payment_date, locale) })}
            </p>
          </div>
          <div className="text-sm leading-5 sm:text-right">
            <p className="text-text-primary font-semibold">{SELLER.name}</p>
            <p className="text-text-muted">{t("nifLine", { nif: SELLER.nif })}</p>
            <p className="text-text-muted">{SELLER.addressLine1}</p>
            <p className="text-text-muted">{SELLER.addressLine2}</p>
            <p className="text-text-muted">{SELLER.phone}</p>
            <p className="text-text-muted">{SELLER.email}</p>
          </div>
        </header>

        {/* Bill-to */}
        <section className="mt-10">
          <h2 className="text-text-muted text-xs font-semibold tracking-wide uppercase">
            {t("billTo")}
          </h2>
          <p className="text-text-primary mt-1 text-sm font-semibold">
            {invoice.customer.full_name || invoice.customer.email}
          </p>
          {invoice.customer.email && (
            <p className="text-text-muted text-sm">{invoice.customer.email}</p>
          )}
        </section>

        {/* Line items */}
        <section className="mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border-muted border-b">
                <th className="text-text-muted pb-2 text-left text-xs font-semibold tracking-wide uppercase">
                  {t("columnDescription")}
                </th>
                <th className="text-text-muted pb-2 pl-2 text-right text-xs font-semibold tracking-wide uppercase">
                  {t("columnAmount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-border-muted divide-y">
              {invoice.shipments.map((shipment) => {
                return (
                  <tr key={shipment.id} className="align-top">
                    <td className="py-3 pr-2">
                      <p className="text-text-primary font-medium">
                        {t("lineDescription", {
                          preset: shipment.parcel_preset_slug
                            ? t(`preset.${shipment.parcel_preset_slug}` as "preset.mini")
                            : shipment.parcel_size,
                        })}
                      </p>
                      <p className="text-text-muted text-xs">
                        {t("lineRoute", {
                          tracking: shipment.tracking_id,
                          origin: shipment.origin_name,
                          destination: shipment.destination_name,
                        })}
                      </p>
                      <p className="text-text-muted text-xs">
                        {t(`speedLine.${shipment.delivery_speed}` as "speedLine.standard")}
                      </p>
                      {shipment.insurance_surcharge_cents > 0 && (
                        <p className="text-text-muted mt-1 text-xs">
                          {t("insuranceLine", {
                            cost: formatCents(shipment.insurance_surcharge_cents),
                            declared: formatCents(shipment.insurance_amount_cents),
                          })}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pl-2 text-right tabular-nums">
                      {formatCents(shipment.price_cents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Totals — Q15.2 order: Delivery → Insurance → Subtotal → VAT → Total */}
        <section className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <Row label={t("delivery")} value={formatCents(deliveryCents)} />
            {insuranceCents > 0 && (
              <Row label={t("insurance")} value={formatCents(insuranceCents)} />
            )}
            <div className="border-border-muted mt-2 border-t pt-2">
              <Row label={t("subtotal")} value={formatCents(subtotalCents)} />
            </div>
            <Row label={t("vat")} value={formatCents(vatCents)} />
            <div className="border-border-muted mt-2 border-t pt-2">
              <Row label={t("total")} value={formatCents(totalCents)} strong />
            </div>
          </dl>
        </section>

        {/* Payment reference */}
        <section className="border-border-muted mt-10 border-t pt-6">
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">{t("paymentMethod")}</dt>
              <dd className="text-text-primary">{t("paidViaStripe")}</dd>
            </div>
            {invoice.payment_intent_id && (
              <div>
                <dt className="text-text-muted">{t("paymentReference")}</dt>
                <dd className="text-text-primary font-mono text-[11px] break-all">
                  {invoice.payment_intent_id}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <footer className="border-border-muted mt-10 border-t pt-6">
          <p className="text-text-muted text-xs leading-5">{t("footer")}</p>
        </footer>
      </article>
    </main>
  );
}

function Row({
  label,
  value,
  helper,
  strong,
}: {
  label: string;
  value: string;
  helper?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "text-text-primary font-semibold" : "text-text-muted"}>
        {label}
        {helper && <span className="text-text-muted ml-1 text-[11px] italic">({helper})</span>}
      </dt>
      <dd
        className={
          strong
            ? "text-text-primary text-base font-semibold tabular-nums"
            : "text-text-primary tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
