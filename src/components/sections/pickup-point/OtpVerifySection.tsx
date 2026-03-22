"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { Button, CardBody, CardHeader, CardShell, Input } from "@/components/atoms";
import { OTP_LENGTH } from "@/constants/app";

import { OtpCodeInput } from "./OtpCodeInput";

interface OtpVerifySectionProps {
  pickupPointId: string;
}

type VerifyState = "idle" | "verifying" | "success" | "failed";

type ShipmentInfo = {
  id: string;
  tracking_id: string;
  status: string;
  receiver_name: string;
  sender_name: string;
};

export function OtpVerifySection({ pickupPointId }: OtpVerifySectionProps) {
  const t = useTranslations("verify");
  const tStatus = useTranslations("shipmentStatus");

  const [trackingId, setTrackingId] = useState("");
  const [shipment, setShipment] = useState<ShipmentInfo | null>(null);
  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const lookupShipment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = trackingId.trim();
      if (!trimmed) return;

      setLookupLoading(true);
      setError(null);
      setShipment(null);

      try {
        const response = await fetch(
          `/api/shipments/lookup?trackingId=${encodeURIComponent(trimmed)}`
        );
        const json = await response.json();

        if (!response.ok) {
          setError(json.error ?? t("shipmentNotFound"));
          return;
        }

        const shipmentData = json.data;
        if (shipmentData.status !== "ready_for_pickup") {
          setError(t("notReadyForPickup", { status: tStatus(shipmentData.status) }));
          return;
        }

        setShipment(shipmentData);
      } catch {
        setError(t("networkError"));
      } finally {
        setLookupLoading(false);
      }
    },
    [trackingId, t, tStatus]
  );

  const sendOtp = useCallback(async () => {
    if (!shipment) return;
    setOtpSending(true);
    setError(null);

    try {
      const response = await fetch("/api/otp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId: shipment.id }),
      });

      if (!response.ok) {
        const json = await response.json();
        setError(json.error ?? t("otpSendFailed"));
        return;
      }

      setOtpSent(true);
    } catch {
      setError(t("networkError"));
    } finally {
      setOtpSending(false);
    }
  }, [shipment, t]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!shipment) return;

    const code = otp.join("");
    if (code.length !== OTP_LENGTH) return;

    setVerifyState("verifying");
    setError(null);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId: shipment.id, otp: code, pickupPointId }),
      });

      const json = await response.json();

      if (!response.ok || !json.data?.verified) {
        setVerifyState("failed");
        setError(t("invalidOtp"));
        return;
      }

      setVerifyState("success");
    } catch {
      setVerifyState("failed");
      setError(t("networkError"));
    }
  }

  function handleReset() {
    setTrackingId("");
    setShipment(null);
    setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
    setVerifyState("idle");
    setError(null);
    setOtpSent(false);
  }

  if (verifyState === "success") {
    return (
      <CardShell>
        <CardBody>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="bg-success-100 flex size-20 items-center justify-center rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="text-success-600 size-10"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-body text-success-700 text-2xl font-semibold">
              {t("deliveryConfirmed")}
            </h3>
            <p className="font-body text-text-muted text-lg">
              {t("deliveryConfirmedDesc", { trackingId: shipment?.tracking_id ?? "" })}
            </p>
            <Button type="button" variant="primary" size="lg" onClick={handleReset}>
              {t("verifyAnother")}
            </Button>
          </div>
        </CardBody>
      </CardShell>
    );
  }

  return (
    <div className="space-y-6">
      {!shipment && (
        <CardShell>
          <CardHeader title={t("findShipment")} />
          <CardBody>
            <form onSubmit={(e) => void lookupShipment(e)} className="space-y-4">
              <p className="font-body text-text-muted text-base">{t("findShipmentDesc")}</p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder={t("trackingIdPlaceholder")}
                  className="flex-1"
                  disabled={lookupLoading}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={lookupLoading || !trackingId.trim()}
                  className="shrink-0"
                >
                  {lookupLoading ? t("searching") : t("findParcel")}
                </Button>
              </div>
            </form>
          </CardBody>
        </CardShell>
      )}

      {shipment && !otpSent && (
        <CardShell>
          <CardHeader title={t("shipmentFound")} />
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailRow label={t("trackingId")} value={shipment.tracking_id} />
                <DetailRow label={t("receiver")} value={shipment.receiver_name} />
              </div>
              <p className="font-body text-text-muted text-base">{t("sendOtpDesc")}</p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => void sendOtp()}
                disabled={otpSending}
                className="w-full"
              >
                {otpSending ? t("sendingOtp") : t("sendOtpToReceiver")}
              </Button>
            </div>
          </CardBody>
        </CardShell>
      )}

      {shipment && otpSent && (
        <CardShell>
          <CardHeader title={t("enterOtp")} />
          <CardBody>
            <form onSubmit={(e) => void handleVerify(e)} className="space-y-6">
              <p className="font-body text-text-muted text-base">{t("enterOtpDesc")}</p>
              <OtpCodeInput
                value={otp}
                onChange={setOtp}
                disabled={verifyState === "verifying"}
                hasError={verifyState === "failed"}
              />
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => void sendOtp()}
                  disabled={otpSending}
                  className="font-body text-primary-500 hover:text-primary-600 text-sm underline"
                >
                  {t("resendOtp")}
                </button>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={verifyState === "verifying" || otp.join("").length !== OTP_LENGTH}
                className="w-full"
              >
                {verifyState === "verifying" ? t("verifying") : t("verifyAndDeliver")}
              </Button>
            </form>
          </CardBody>
        </CardShell>
      )}

      {error && (
        <div className="bg-error-50 flex items-center gap-3 rounded-xl px-5 py-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-error-600 size-5 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="font-body text-error-700 text-base">{error}</p>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-default rounded-lg border px-4 py-3">
      <p className="font-body text-text-muted text-sm">{label}</p>
      <p className="font-body text-text-primary mt-0.5 text-base font-medium">{value}</p>
    </div>
  );
}
