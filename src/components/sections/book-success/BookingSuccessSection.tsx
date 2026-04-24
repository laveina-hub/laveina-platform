"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button, SectionContainer } from "@/components/atoms";
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImagePlaceholderIcon,
  MapPinIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { useBookingStore, type BookingSender } from "@/hooks/use-booking-store";
import { Link } from "@/i18n/navigation";
import { buildBulkWhatsAppText, buildQrBundlePdf } from "@/lib/qr/bulk-download";

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
      // Stripe webhook may still be in flight — poll up to ~10s.
      const MAX_ATTEMPTS = 5;
      const POLL_INTERVAL_MS = 2000;

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
            setShipments(json.data);
            setLoading(false);
            return;
          }
        }

        setError(true);
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

  return (
    <div className="bg-bg-secondary min-h-screen px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
      <SectionContainer>
        <div className="mx-auto flex max-w-md flex-col">
          <div className="shadow-overlay rounded-2xl bg-white px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex flex-col items-center gap-5 text-center">
              <AnimatedCheckBadge />
              <div>
                <h1 className="font-display text-text-primary text-xl leading-tight font-bold sm:text-2xl">
                  {t("title")}
                </h1>
                <p className="text-text-muted mt-2 text-sm">
                  {shipments.length > 1
                    ? t("subtitleMulti", { count: shipments.length })
                    : t("subtitle")}
                </p>
              </div>
            </div>

            {showSaveSenderPrompt && (
              <div
                role="status"
                className="border-primary-200 bg-primary-50/70 mt-6 flex items-start gap-3 rounded-xl border p-3"
              >
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-semibold">{t("saveSenderTitle")}</p>
                  <p className="text-text-muted mt-0.5 text-xs">{t("saveSenderBody")}</p>
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

            <div className="mt-6 flex flex-col gap-6">
              {shipments.map((shipment, index) => (
                <ShipmentConfirmationCard
                  key={shipment.id}
                  shipment={shipment}
                  index={index}
                  total={shipments.length}
                />
              ))}
            </div>

            {shipments.length > 1 && <BulkActions shipments={shipments} />}

            {/* Multi-parcel gets a per-card View tracking link instead. */}
            {shipments.length === 1 && (
              <div className="mt-6 flex justify-center">
                <Link
                  href={`/tracking/${shipments[0].tracking_id}`}
                  className="text-primary-600 hover:text-primary-700 inline-flex items-center justify-center gap-1 text-sm font-semibold"
                >
                  {t("viewTracking")}
                  <ExternalLinkIcon className="h-4 w-4" />
                </Link>
              </div>
            )}

            <p className="text-text-muted mt-3 text-center text-xs">{t("emailCopyNote")}</p>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}

// ── animated check badge ───────────────────────────────────────────────────

function AnimatedCheckBadge() {
  // Layered success badge matching Payment confirmed + QR code-v2.png:
  //  - Outermost static halo (very faint, fades in).
  //  - Two animated ping rings staggered 0.5s apart → wave effect.
  //  - Solid green disk with a bouncy pop (success-pop keyframe).
  //  - Check icon fades in 200ms after the disk lands.
  // Only `--color-success` is defined in globals.css, so we use Tailwind v4
  // `/opacity` modifiers on the base token for all halo layers. Every motion
  // layer is hidden via `motion-reduce:hidden` so the static halo alone is
  // visible for users who prefer no motion.
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      {/* Outer soft static halo */}
      <span aria-hidden className="bg-success/10 animate-fade-in absolute inset-0 rounded-full" />
      {/* First ping ring */}
      <span
        aria-hidden
        className="bg-success/30 absolute inset-1 animate-ping rounded-full motion-reduce:hidden"
      />
      {/* Second ping ring — delayed for wave effect */}
      <span
        aria-hidden
        className="bg-success/20 absolute inset-3 animate-ping rounded-full [animation-delay:500ms] motion-reduce:hidden"
      />
      {/* Solid green disk with bouncy entrance. */}
      <div className="bg-success animate-success-pop motion-reduce:animate-fade-in relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
        {/* Check fades in shortly after the disk lands. Wrap in a span so
            the animation delay can be expressed as a class (the CheckIcon
            component doesn't accept a style prop). */}
        <span className="animate-fade-in [animation-delay:300ms] motion-reduce:animate-none">
          <CheckIcon className="h-8 w-8 text-white" />
        </span>
      </div>
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

  return (
    <section>
      {total > 1 && (
        <p className="text-text-muted mb-3 text-center text-xs font-semibold tracking-wide uppercase">
          {t("parcelNumber", { number: index + 1 })}
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        {shipment.qr_code_url ? (
          <div className="border-border-muted rounded-xl border bg-white p-3">
            <Image
              src={shipment.qr_code_url}
              alt={t("qrAlt")}
              width={180}
              height={180}
              className="h-36 w-36 sm:h-40 sm:w-40"
            />
          </div>
        ) : (
          <div className="border-border-muted bg-bg-secondary text-text-muted flex h-36 w-36 items-center justify-center rounded-xl border sm:h-40 sm:w-40">
            <ImagePlaceholderIcon className="h-8 w-8" />
          </div>
        )}
        <p className="text-text-primary text-sm font-medium tracking-widest">
          {shipment.tracking_id}
        </p>
      </div>

      {origin && (
        /* Figma node 36900:28213 — 116px pickup thumbnail + name/address/
           get-directions stack. Tailwind v4 maps 116px to the h-29 / w-29
           tokens. */
        <div className="border-border-muted mt-5 flex items-center gap-3 rounded-xl border p-5">
          <div className="bg-bg-secondary text-text-muted flex h-29 w-29 shrink-0 items-center justify-center overflow-hidden rounded-lg">
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
            <p className="text-text-primary truncate text-xl leading-7 font-medium">
              {origin.name}
            </p>
            <p className="text-text-muted inline-flex items-center gap-1 truncate text-base">
              <MapPinIcon className="h-4 w-4 shrink-0" />
              {origin.address}
            </p>
            {directionsHref && (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 mt-1 inline-flex items-center gap-2 text-sm font-semibold"
              >
                {t("getDirections")}
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Matches Payment confirmed + QR code-v2.png: outlined "Download QR"
          (PDF default per spec Q10.3) + green "Share QR via Whatsapp".
          PNG stays available as a small secondary text link below the row so
          we don't lose the option, but the row reads cleanly as 2 buttons. */}
      <div className="mt-5 flex flex-col items-center gap-3">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          {shipment.qr_code_url && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="w-full sm:w-auto"
            >
              <DownloadIcon className="mr-2 h-5 w-5" />
              {downloadingPdf ? t("downloadPdfPreparing") : t("downloadQr")}
            </Button>
          )}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="sm:w-auto">
            <Button
              type="button"
              size="md"
              className="w-full bg-[#25D366] text-white hover:bg-[#1fb857] active:bg-[#159942] sm:w-auto"
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

      {total > 1 && (
        <div className="mt-4 flex justify-center">
          <Link
            href={`/tracking/${shipment.tracking_id}`}
            className="text-primary-600 hover:text-primary-700 inline-flex items-center justify-center gap-1 text-sm font-semibold"
          >
            {t("viewTracking")}
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
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
    <div className="border-border-muted mt-6 flex flex-col gap-2 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-text-primary text-sm font-semibold">
        {t("bulkActionsTitle", { count: shipments.length })}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDownloadAll}
          disabled={generatingPdf}
        >
          <DownloadIcon className="mr-1 h-5 w-5" />
          {generatingPdf ? t("bulkDownloadPreparing") : t("bulkDownloadAll")}
        </Button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border-default hover:border-primary-300 inline-flex items-center justify-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <WhatsAppIcon className="h-5 w-5" />
          {t("bulkShareAll")}
        </a>
      </div>
    </div>
  );
}
