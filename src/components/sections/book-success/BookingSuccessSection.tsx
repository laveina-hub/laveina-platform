"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AnimatedCheckBadge, Button, SectionContainer } from "@/components/atoms";
import {
  CloseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImagePlaceholderIcon,
  MapPinIcon,
  PackageIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { useBookingStore, type BookingSender } from "@/hooks/use-booking-store";
import { Link } from "@/i18n/navigation";
import { buildBulkWhatsAppText, buildQrBundlePdf } from "@/lib/qr/bulk-download";
import { cn } from "@/lib/utils";

// Multi-parcel stacks single-parcel cards plus aggregated "Download all" /
// "Share all" actions (Q10.2/10.3) when shipments.length > 1.
// A4 (client answer 2026-04-21): if the user edited their sender fields on
// Step 3 (`sender.overriddenLocally === true`), offer a one-time prompt to
// persist the override back to their profile.

type ShipmentConfirmation = {
  id: string;
  tracking_id: string;
  qr_code_url: string | null;
  status: string;
  parcel_size: string;
  weight_kg: number;
  delivery_mode: string;
  delivery_speed: string;
  price_cents: number;
  created_at: string;
  origin_pickup_point: {
    name: string;
    address: string;
    city: string | null;
    image_url?: string | null;
  } | null;
  destination_pickup_point: { name: string; address: string; city: string | null } | null;
};

export function BookingSuccessSection() {
  const t = useTranslations("bookingSuccess");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  // Read sender snapshot synchronously BEFORE reset so the Save-to-profile
  // prompt still has the overridden values to send back.
  const storeSender = useBookingStore.getState().sender;
  const senderSnapshotRef = useRef<BookingSender | null>(
    storeSender?.overriddenLocally ? storeSender : null
  );
  const { reset } = useBookingStore();

  const [shipments, setShipments] = useState<ShipmentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [senderPromptDismissed, setSenderPromptDismissed] = useState(false);
  const [savingSender, setSavingSender] = useState(false);

  useEffect(() => {
    let cancelled = false;
    reset();

    if (!sessionId) {
      setLoading(false);
      setError(true);
      return;
    }

    async function load() {
      const url = `/api/shipments/by-session?session_id=${encodeURIComponent(sessionId!)}`;
      // The Stripe webhook creates shipment rows first, then generates + uploads
      // each QR to storage. We keep polling until every shipment has a signed
      // `qr_code_url` so the UI + bulk PDF never show fallbacks for a QR that
      // is merely still in flight. After MAX_ATTEMPTS we render what we have.
      const MAX_ATTEMPTS = 8;
      const POLL_INTERVAL_MS = 1500;
      let latest: ShipmentConfirmation[] = [];

      try {
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
          if (cancelled) return;

          const res = await fetch(url);
          const json = await res.json();
          if (cancelled) return;

          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            latest = json.data;
            const allQrsReady = latest.every((s) => s.qr_code_url);
            if (allQrsReady) {
              setShipments(latest);
              setLoading(false);
              return;
            }
          }
        }

        if (latest.length > 0) {
          // Render what we have so the user isn't stuck — some QRs may still
          // appear as fallbacks, but the confirmation itself is valid.
          setShipments(latest);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <span
          className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4"
          role="status"
          aria-label={t("title")}
        />
      </div>
    );
  }

  if (error || shipments.length === 0) {
    return (
      <SectionContainer className="py-24 text-center">
        <p className="text-text-muted">{t("loadError")}</p>
        <Link href="/customer" className="text-primary-500 mt-4 inline-block">
          {t("viewShipments")}
        </Link>
      </SectionContainer>
    );
  }

  const senderSnapshot = senderSnapshotRef.current;
  const showSaveSenderPrompt = senderSnapshot !== null && !senderPromptDismissed;

  async function handleSaveSender() {
    if (!senderSnapshot) return;
    setSavingSender(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: senderSnapshot.firstName,
          last_name: senderSnapshot.lastName,
          phone: senderSnapshot.phone,
          whatsapp: senderSnapshot.whatsapp || senderSnapshot.phone,
        }),
      });
      if (!res.ok) throw new Error("save-profile failed");
      toast.success(t("saveSenderSuccess"));
      senderSnapshotRef.current = null;
      setSenderPromptDismissed(true);
    } catch (err) {
      console.error("save sender failed:", err);
      toast.error(t("saveSenderFailed"));
    } finally {
      setSavingSender(false);
    }
  }

  const isMulti = shipments.length > 1;

  return (
    <div className="bg-bg-secondary min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <SectionContainer>
        <div
          className={cn("mx-auto flex flex-col gap-5 sm:gap-6", isMulti ? "max-w-3xl" : "max-w-xl")}
        >
          {/* Hero success card */}
          <div className="shadow-overlay animate-fade-in-up rounded-2xl bg-white px-6 py-10 text-center sm:px-10 sm:py-12">
            <div className="flex flex-col items-center gap-5">
              <AnimatedCheckBadge />
              <div>
                <h1 className="font-display text-text-primary text-2xl leading-tight font-bold sm:text-3xl">
                  {t("title")}
                </h1>
                <p className="text-text-muted mx-auto mt-2 max-w-md text-sm sm:text-base">
                  {isMulti ? t("subtitleMulti", { count: shipments.length }) : t("subtitle")}
                </p>
              </div>
            </div>
          </div>

          {/* Save-sender prompt (overridden sender only) */}
          {showSaveSenderPrompt && (
            <div
              role="status"
              className="border-primary-200 bg-primary-50/70 shadow-card flex items-start gap-3 rounded-2xl border p-4 sm:p-5"
            >
              <div className="flex-1">
                <p className="text-text-primary text-sm font-semibold sm:text-base">
                  {t("saveSenderTitle")}
                </p>
                <p className="text-text-muted mt-1 text-xs sm:text-sm">{t("saveSenderBody")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={handleSaveSender}
                    disabled={savingSender}
                  >
                    {savingSender ? t("saveSenderSaving") : t("saveSenderSave")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSenderPromptDismissed(true)}
                    disabled={savingSender}
                  >
                    {t("saveSenderNotNow")}
                  </Button>
                </div>
              </div>
              <button
                type="button"
                aria-label={t("saveSenderDismiss")}
                onClick={() => setSenderPromptDismissed(true)}
                className="text-text-muted hover:text-text-primary focus-visible:outline-primary-500 flex h-7 w-7 shrink-0 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <CloseIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          {/* Bulk actions: promoted above the list for multi-parcel bookings */}
          {isMulti && <BulkActions shipments={shipments} />}

          {/* Parcel cards — each shipment gets its own elevated card */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {shipments.map((shipment, index) => (
              <ShipmentConfirmationCard
                key={shipment.id}
                shipment={shipment}
                index={index}
                total={shipments.length}
              />
            ))}
          </div>

          {/* Single-parcel tracking link (multi-parcel shows it per-card) */}
          {!isMulti && (
            <div className="flex justify-center">
              <Link
                href={`/tracking/${shipments[0].tracking_id}`}
                className="text-primary-600 hover:text-primary-700 inline-flex items-center justify-center gap-1 text-sm font-semibold"
              >
                {t("viewTracking")}
                <ExternalLinkIcon className="h-4 w-4" />
              </Link>
            </div>
          )}

          <p className="text-text-muted text-center text-xs sm:text-sm">{t("emailCopyNote")}</p>
        </div>
      </SectionContainer>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

type CardProps = {
  shipment: ShipmentConfirmation;
  index: number;
  total: number;
};

function ShipmentConfirmationCard({ shipment, index, total }: CardProps) {
  const t = useTranslations("bookingSuccess");
  const origin = shipment.origin_pickup_point;
  const destination = shipment.destination_pickup_point;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const trackingUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/tracking/${shipment.tracking_id}`;
  }, [shipment.tracking_id]);

  const whatsappHref = useMemo(() => {
    if (!trackingUrl) return "#";
    const text = t("shareMessage", { trackingId: shipment.tracking_id, url: trackingUrl });
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [shipment.tracking_id, trackingUrl, t]);

  const directionsHref = origin
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${origin.name} ${origin.address}${origin.city ? `, ${origin.city}` : ""}`
      )}`
    : null;

  // Q10.3 — single-parcel PDF download reuses the bulk helper with one item.
  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const blob = await buildQrBundlePdf(
        [
          {
            trackingId: shipment.tracking_id,
            qrUrl: shipment.qr_code_url,
            originName: origin?.name ?? null,
            destinationName: destination?.name ?? null,
          },
        ],
        {
          instructionText: t("pdfInstructionText"),
          fromLabel: t("pdfFromLabel"),
          toLabel: t("pdfToLabel"),
        }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laveina-${shipment.tracking_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("single pdf failed:", err);
      toast.error(t("bulkDownloadError"));
    } finally {
      setDownloadingPdf(false);
    }
  }

  const isMulti = total > 1;

  return (
    <section className="shadow-card animate-fade-in-up overflow-hidden rounded-2xl bg-white">
      {/* Header row — numbered badge + per-card tracking link (multi only) */}
      {isMulti && (
        <div className="border-border-muted bg-bg-light flex items-center justify-between gap-3 border-b px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="bg-primary-500 text-text-inverse inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm">
              {index + 1}
            </span>
            <p className="text-text-primary text-sm font-semibold sm:text-base">
              {t("parcelNumber", { number: index + 1 })}
            </p>
          </div>
          <Link
            href={`/tracking/${shipment.tracking_id}`}
            className="text-primary-600 hover:text-primary-700 inline-flex shrink-0 items-center gap-1 text-sm font-semibold"
          >
            <span className="hidden sm:inline">{t("viewTracking")}</span>
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6 p-6 sm:gap-7 sm:p-8">
        {/* QR + tracking ID — hero element of the card */}
        <div className="flex flex-col items-center gap-3">
          {shipment.qr_code_url ? (
            <div className="border-border-muted rounded-2xl border bg-white p-3 shadow-xs">
              <Image
                src={shipment.qr_code_url}
                alt={t("qrAlt")}
                width={200}
                height={200}
                className="h-40 w-40 sm:h-44 sm:w-44"
              />
            </div>
          ) : (
            <div className="border-border-muted bg-bg-secondary text-text-muted flex h-40 w-40 items-center justify-center rounded-2xl border sm:h-44 sm:w-44">
              <ImagePlaceholderIcon className="h-10 w-10" />
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <p className="text-text-muted text-[11px] font-semibold tracking-[0.12em] uppercase">
              {t("trackingIdLabel")}
            </p>
            <p className="text-text-primary font-mono text-base font-semibold tracking-[0.2em] sm:text-lg">
              {shipment.tracking_id}
            </p>
          </div>
        </div>

        {/* Drop-off pickup point */}
        {origin && (
          <div className="flex flex-col gap-2">
            <p className="text-text-muted inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
              <PackageIcon className="h-3.5 w-3.5" />
              {t("dropOff")}
            </p>
            <div className="border-border-muted flex items-center gap-4 rounded-xl border p-4 sm:p-5">
              <div className="bg-bg-secondary text-text-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg sm:h-24 sm:w-24">
                {origin.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={origin.image_url}
                    alt={origin.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/images/pickup-points/store-fallback.svg"
                    alt={origin.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-text-primary truncate text-base leading-tight font-semibold sm:text-lg">
                  {origin.name}
                </p>
                <p className="text-text-muted inline-flex items-start gap-1.5 text-sm">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {origin.address}
                    {origin.city ? `, ${origin.city}` : ""}
                  </span>
                </p>
                {directionsHref && (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 mt-1 inline-flex items-center gap-1.5 text-sm font-semibold"
                  >
                    {t("getDirections")}
                    <ExternalLinkIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions: outlined Download QR (PDF) + green Share QR via WhatsApp,
            with PNG download as a secondary text link. */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
            {shipment.qr_code_url && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full sm:flex-1"
              >
                <DownloadIcon className="mr-2 h-5 w-5" />
                {downloadingPdf ? t("downloadPdfPreparing") : t("downloadQr")}
              </Button>
            )}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1"
            >
              <Button
                type="button"
                size="md"
                className="w-full bg-[#25D366] text-white hover:bg-[#1fb857] active:bg-[#159942]"
              >
                <WhatsAppIcon className="mr-2 h-5 w-5" />
                {t("shareQrWhatsapp")}
              </Button>
            </a>
          </div>
          {shipment.qr_code_url && (
            <a
              href={shipment.qr_code_url}
              download={`laveina-${shipment.tracking_id}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-primary-600 text-xs font-medium underline-offset-2 hover:underline"
            >
              {t("downloadPngAlt")}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Q10.2/10.3 — multi-parcel bulk actions ─────────────────────────────────
// Bundles all parcels' QR codes into one PDF and builds a single WhatsApp
// share link. The PDF generation is client-side (jsPDF) so we don't need a
// server route for what is essentially a one-off download.

type BulkActionsProps = {
  shipments: ShipmentConfirmation[];
};

function BulkActions({ shipments }: BulkActionsProps) {
  const t = useTranslations("bookingSuccess");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const trackingBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/tracking`;
  }, []);

  async function handleDownloadAll() {
    setGeneratingPdf(true);
    try {
      const blob = await buildQrBundlePdf(
        shipments.map((s) => ({
          trackingId: s.tracking_id,
          qrUrl: s.qr_code_url,
          originName: s.origin_pickup_point?.name ?? null,
          destinationName: s.destination_pickup_point?.name ?? null,
        })),
        {
          instructionText: t("pdfInstructionText"),
          fromLabel: t("pdfFromLabel"),
          toLabel: t("pdfToLabel"),
        }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laveina-qr-bundle-${shipments.length}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("bulk pdf failed:", err);
      toast.error(t("bulkDownloadError"));
    } finally {
      setGeneratingPdf(false);
    }
  }

  const whatsappHref = useMemo(() => {
    if (!trackingBaseUrl) return "#";
    const text = buildBulkWhatsAppText(
      shipments.map((s) => ({ trackingId: s.tracking_id, qrUrl: s.qr_code_url })),
      trackingBaseUrl,
      t("bulkShareIntro", { count: shipments.length })
    );
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [shipments, trackingBaseUrl, t]);

  return (
    <div className="shadow-card border-primary-100 bg-primary-50/40 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="bg-primary-500 text-text-inverse inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm">
          <PackageIcon className="h-5 w-5" />
        </span>
        <div className="flex flex-col leading-tight">
          <p className="text-text-primary text-sm font-semibold sm:text-base">
            {t("bulkActionsTitle", { count: shipments.length })}
          </p>
          <p className="text-text-muted text-xs sm:text-sm">
            {t("subtitleMulti", { count: shipments.length })}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
        <Button
          type="button"
          size="md"
          variant="outline"
          onClick={handleDownloadAll}
          disabled={generatingPdf}
          className="w-full sm:w-auto"
        >
          <DownloadIcon className="mr-2 h-5 w-5" />
          {generatingPdf ? t("bulkDownloadPreparing") : t("bulkDownloadAll")}
        </Button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto"
        >
          <Button
            type="button"
            size="md"
            className="w-full bg-[#25D366] text-white hover:bg-[#1fb857] active:bg-[#159942] sm:w-auto"
          >
            <WhatsAppIcon className="mr-2 h-5 w-5" />
            {t("bulkShareAll")}
          </Button>
        </a>
      </div>
    </div>
  );
}
