import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getClientIp, publicLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getInvoiceBySession, type InvoiceData } from "@/services/invoice.service";

// Q14.1.9 — server-side PDF download for a Stripe session's invoice.
// Mirrors the layout of `CustomerInvoiceView` but produces a real attachment
// so the user can save the file directly without going through the browser
// print-to-PDF dialog. C5 legal block hard-coded (single-tenant value).

export const dynamic = "force-dynamic";

const SELLER = {
  name: "LAVEINA TECH, SOCIEDAD LIMITADA",
  nif: "B70881610",
  addressLine1: "C/ Rambla de l'Exposició, 103, Planta 1",
  addressLine2: "08800 Vilanova i la Geltrú, Barcelona, España",
  phone: "+34 934 652 923",
  email: "info@laveina.co",
} as const;

const IVA_RATE = 0.21;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const rl = publicLimiter.check(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const result = await getInvoiceBySession(user.id, sessionId);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.status });
  }

  const pdfBuffer = Buffer.from(renderInvoicePdf(result.data));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laveina-${result.data.invoice_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function renderInvoicePdf(invoice: InvoiceData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Laveina", margin, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice / Factura", pageW - margin, y, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(invoice.invoice_number, pageW - margin, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(
    new Date(invoice.payment_date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    pageW - margin,
    y + 12,
    { align: "right" }
  );

  y += 22;

  // Seller
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Emisor", margin, y);
  doc.setTextColor(0);
  doc.setFontSize(10);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(SELLER.name, margin, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  doc.text(`NIF: ${SELLER.nif}`, margin, y);
  y += 5;
  doc.text(SELLER.addressLine1, margin, y);
  y += 5;
  doc.text(SELLER.addressLine2, margin, y);
  y += 5;
  doc.text(`${SELLER.phone} · ${SELLER.email}`, margin, y);

  // Customer
  let custY = y - 25;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Cliente", pageW / 2 + 10, custY);
  doc.setTextColor(0);
  doc.setFontSize(10);
  custY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(invoice.customer.full_name || "—", pageW / 2 + 10, custY);
  doc.setFont("helvetica", "normal");
  custY += 5;
  doc.text(invoice.customer.email || "—", pageW / 2 + 10, custY);

  y += 12;

  // Line items header
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Tracking", margin, y);
  doc.text("Servicio", margin + 38, y);
  doc.text("Importe", pageW - margin, y, { align: "right" });
  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");

  for (const shipment of invoice.shipments) {
    doc.text(shipment.tracking_id, margin, y);
    const label = `${shipment.parcel_size} · ${shipment.delivery_speed}`;
    doc.text(label, margin + 38, y);
    doc.text(formatCents(shipment.price_cents), pageW - margin, y, { align: "right" });
    y += 5;
    doc.setTextColor(120);
    doc.setFontSize(8);
    doc.text(`${shipment.origin_name} → ${shipment.destination_name}`, margin + 38, y);
    doc.setTextColor(0);
    doc.setFontSize(9);
    y += 6;
  }

  // Totals per Q15.2:
  //   Subtotal = Delivery + Insurance  (both ex-VAT)
  //   VAT      = 21% × Subtotal
  //   Total    = Subtotal + VAT       (= stored price_cents)
  // `shipments.price_cents` already includes VAT + insurance; we derive the
  // breakdown backwards so the invoice shows the explicit split.
  const total = invoice.shipments.reduce((sum, s) => sum + s.price_cents, 0);
  const insurance = invoice.shipments.reduce((sum, s) => sum + s.insurance_surcharge_cents, 0);
  const subtotal = Math.round(total / (1 + IVA_RATE));
  const vat = total - subtotal;
  const delivery = subtotal - insurance;

  y += 4;
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const totalsX = pageW - margin;
  doc.text("Envío:", totalsX - 50, y);
  doc.text(formatCents(delivery), totalsX, y, { align: "right" });
  if (insurance > 0) {
    y += 5;
    doc.text("Seguro:", totalsX - 50, y);
    doc.text(formatCents(insurance), totalsX, y, { align: "right" });
  }
  y += 5;
  doc.text("Subtotal:", totalsX - 50, y);
  doc.text(formatCents(subtotal), totalsX, y, { align: "right" });
  y += 5;
  doc.text(`IVA (21%):`, totalsX - 50, y);
  doc.text(formatCents(vat), totalsX, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total:", totalsX - 50, y);
  doc.text(formatCents(total), totalsX, y, { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `${SELLER.name} · NIF ${SELLER.nif} · ${SELLER.addressLine1} · ${SELLER.addressLine2}`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  return new Uint8Array(doc.output("arraybuffer"));
}
