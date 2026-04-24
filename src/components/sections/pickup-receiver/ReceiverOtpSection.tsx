"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, SectionContainer } from "@/components/atoms";
import { ClockIcon, CopyIcon, ExternalLinkIcon, MapPinIcon, PackageIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// `code` is null until plaintext OTP storage is added to the schema — UI
// renders empty boxes with a "check WhatsApp" hint. When the schema changes
// the prop flips on without a component rewrite.
// Countdown turns red during the last 5 minutes of the 24h expiry window.

type PickupPoint = {
  name: string;
  address: string;
  city?: string | null;
  workingHours?: string | null;
  imageUrl?: string | null;
};

type Props = {
  /** Accepted by the caller for route context; not rendered in this layout. */
  trackingId: string;
  shipmentId: string;
  /** URL token — forwarded to `/api/otp/resend` so the server can re-verify
   *  before issuing a fresh OTP. */
  token: string;
  /** Plaintext OTP code, or null when not available. */
  code: string | null;
  /** Canonical ISO timestamp from otp_verifications.expires_at. */
  expiresAt: string;
  destination: PickupPoint;
};

const CODE_BOX_COUNT = 6;
const TIMER_ACTIVE_MS = 5 * 60 * 1000;

export function ReceiverOtpSection({ shipmentId, token, code, expiresAt, destination }: Props) {
  const t = useTranslations("receiverOtp");
  const tTracking = useTranslations("tracking");

  const codeDigits = useMemo(() => {
    const chars = (code ?? "").replace(/\D/g, "").slice(0, CODE_BOX_COUNT).split("");
    while (chars.length < CODE_BOX_COUNT) chars.push("");
    return chars;
  }, [code]);

  const [msLeft, setMsLeft] = useState<number>(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  );
  useEffect(() => {
    const expiresMs = new Date(expiresAt).getTime();
    const tick = () => setMsLeft(Math.max(0, expiresMs - Date.now()));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const hoursLeft = Math.max(0, Math.floor(msLeft / (60 * 60 * 1000)));
  const countdownVisible = msLeft > 0 && msLeft <= TIMER_ACTIVE_MS;
  // Q12.3 — explicit "expired" state drives a different layout: replaces the
  // code grid + countdown with a clear banner and elevates "Request new code"
  // to the primary action.
  const isExpired = msLeft === 0;
  const countdownLabel = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const mm = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const ss = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }, [msLeft]);

  const [resending, setResending] = useState(false);

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("codeCopied"));
    } catch {
      toast.error(t("resendFailed"));
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch("/api/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: shipmentId, token }),
      });
      if (!res.ok) throw new Error("resend failed");
      toast.success(t("resendSent"));
      // Q12.3 — reload so the server re-fetches the new OTP + expiry for
      // the receiver; the page is server-rendered from the token.
      if (isExpired && typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      toast.error(t("resendFailed"));
    } finally {
      setResending(false);
    }
  }

  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${destination.name} ${destination.address}${destination.city ? `, ${destination.city}` : ""}`
  )}`;

  return (
    <div className="from-primary-50 via-bg-primary to-primary-50 min-h-screen bg-linear-to-r px-4 pt-10 pb-24 sm:px-6 lg:px-10">
      <SectionContainer>
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <section className="border-border-muted rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-50 text-primary-600 flex h-10 w-10 items-center justify-center rounded-xl">
                <PackageIcon className="h-5 w-5" />
              </div>
              <h1 className="text-text-primary text-lg font-semibold">{t("heroTitle")}</h1>
            </div>

            <div className="bg-bg-secondary mt-4 flex items-start gap-3 rounded-xl p-3">
              <div className="text-text-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                {destination.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={destination.imageUrl}
                    alt={destination.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/images/pickup-points/store-fallback.svg"
                    alt={destination.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text-primary truncate text-sm font-semibold">
                  {destination.name}
                </p>
                <div className="text-text-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{destination.address}</span>
                  </span>
                  {destination.workingHours && (
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3 w-3 shrink-0" />
                      {destination.workingHours}
                    </span>
                  )}
                </div>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 mt-1.5 inline-flex items-center gap-1 text-xs font-medium"
                >
                  {tTracking("shareLabel")}
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </div>
            </div>
          </section>

          <section className="border-border-muted rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            {isExpired ? (
              // Q12.3 — expired state: replace code + countdown with a clear
              // amber banner and promote "Request new code" to the primary CTA.
              <>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <ClockIcon className="h-6 w-6 text-amber-600" />
                  <p className="text-base font-semibold text-amber-900">{t("expiredTitle")}</p>
                  <p className="text-sm text-amber-800">{t("expiredBody")}</p>
                </div>

                <div className="mt-5">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full"
                  >
                    {resending ? t("resending") : t("requestNewCode")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-text-muted mb-4 text-center text-sm">{t("pickupCodeLabel")}</p>

                <div className="flex items-center justify-center gap-2">
                  {codeDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "border-border-default flex h-12 w-12 items-center justify-center rounded-lg border bg-white text-lg font-semibold tracking-tight shadow-xs",
                        digit ? "text-text-primary" : "text-text-muted"
                      )}
                    >
                      {digit || ""}
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleCopy}
                    disabled={!code}
                    className="w-full"
                  >
                    <CopyIcon className="mr-2 h-4 w-4" />
                    {t("copyCode")}
                  </Button>
                </div>

                <p className="text-text-muted mt-4 inline-flex w-full items-center justify-center gap-1 text-sm">
                  <ClockIcon className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700">
                    {t("expiresInHours", { hours: hoursLeft })}
                  </span>
                </p>

                {countdownVisible && (
                  <p className="mt-1 text-center text-sm font-semibold text-red-600">
                    {t("timeLeft", { time: countdownLabel })}
                  </p>
                )}

                {!code && (
                  <p className="text-text-muted mt-3 text-center text-xs">
                    {t("openLinkFromWhatsapp")}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-center gap-1 text-center text-sm">
                  <span className="text-text-muted">{t("didntReceive")}</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-60"
                  >
                    {resending ? t("resending") : t("resend")}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </SectionContainer>
    </div>
  );
}
