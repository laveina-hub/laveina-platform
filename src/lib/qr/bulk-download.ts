"use client";

// Q10.2/10.3 — bundles N shipment QR codes into a single PDF (one per page)
// + builds a WhatsApp-share text containing all tracking links. Pure helpers
// so they can be reused from any post-checkout / shipment view.

import { jsPDF } from "jspdf";

export type BulkQrParcel = {
  trackingId: string;
  qrUrl: string | null;
  originName?: string | null;
  destinationName?: string | null;
};

type PdfBundleOptions = {
  /** Q10.3 — "Show this code at pickup point" footer; caller passes localised copy. */
  instructionText?: string;
  /** i18n labels for origin/destination prefixes (e.g. "From:", "To:"). */
  fromLabel?: string;
  toLabel?: string;
};

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch_qr_failed_${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    // SAFETY: FileReader.result is `string | ArrayBuffer | null`, but
    // readAsDataURL always resolves to a string per the Web spec.
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read_qr_failed"));
    reader.readAsDataURL(blob);
  });
}

/** Returns a Blob you can assign to an `<a download>` href. Throws on
 *  network errors so the caller can surface a toast. */
export async function buildQrBundlePdf(
  parcels: BulkQrParcel[],
  options: PdfBundleOptions = {}
): Promise<Blob> {
  if (parcels.length === 0) throw new Error("empty_parcels");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const qrSize = 90;
  const qrX = (pageW - qrSize) / 2;

  for (let i = 0; i < parcels.length; i++) {
    const parcel = parcels[i];
    if (i > 0) doc.addPage();

    doc.setFontSize(18);
    doc.text("Laveina Spain", pageW / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(parcel.trackingId, pageW / 2, 30, { align: "center" });

    let cursorY = 40;
    doc.setFontSize(10);
    doc.setTextColor(120);
    if (parcel.originName) {
      const line = options.fromLabel
        ? `${options.fromLabel} ${parcel.originName}`
        : parcel.originName;
      doc.text(line, pageW / 2, cursorY, { align: "center" });
      cursorY += 6;
    }
    if (parcel.destinationName) {
      const line = options.toLabel
        ? `${options.toLabel} ${parcel.destinationName}`
        : parcel.destinationName;
      doc.text(line, pageW / 2, cursorY, { align: "center" });
      cursorY += 6;
    }
    doc.setTextColor(0);

    const qrY = Math.max(cursorY + 4, 52);
    if (parcel.qrUrl) {
      try {
        const dataUrl = await fetchAsDataUrl(parcel.qrUrl);
        doc.addImage(dataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch {
        doc.setFontSize(10);
        doc.text("QR unavailable", pageW / 2, qrY + 40, { align: "center" });
      }
    }

    if (options.instructionText) {
      doc.setFontSize(11);
      doc.text(options.instructionText, pageW / 2, qrY + qrSize + 12, { align: "center" });
    }

    if (parcels.length > 1) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Parcel ${i + 1} of ${parcels.length}`, pageW / 2, pageH - 15, { align: "center" });
      doc.setTextColor(0);
    }
  }

  return doc.output("blob");
}

export function buildBulkWhatsAppText(
  parcels: BulkQrParcel[],
  trackingBaseUrl: string,
  intro: string
): string {
  const lines = [intro, ""];
  for (const p of parcels) {
    lines.push(`${p.trackingId} — ${trackingBaseUrl}/${p.trackingId}`);
  }
  return lines.join("\n");
}
