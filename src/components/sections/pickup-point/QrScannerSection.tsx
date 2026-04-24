"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, CardBody, CardHeader, CardShell, Input } from "@/components/atoms";
import { cn } from "@/lib/utils";

import { ScanResultCard } from "./ScanResultCard";

type ScanResult = {
  trackingId: string;
  shipment: {
    id: string;
    tracking_id: string;
    status: string;
    sender_first_name: string;
    sender_last_name: string;
    receiver_first_name: string;
    receiver_last_name: string;
    parcel_size: string;
  };
  scanLog: { old_status: string; new_status: string };
  otpSent?: boolean;
};

interface QrScannerSectionProps {
  pickupPointId: string;
}

const QR_READER_ID = "qr-reader";

export function QrScannerSection({ pickupPointId }: QrScannerSectionProps) {
  const t = useTranslations("scanner");

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);

  // SAFETY: type only available after dynamic import
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const processingRef = useRef(false);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          // SCANNING or PAUSED
          await scannerRef.current.stop();
        }
      } catch {
        // Already stopped
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const processScan = useCallback(
    async (trackingId: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanning(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingId, pickupPointId }),
        });

        const json = await response.json();

        if (!response.ok) {
          setError({ message: json.error ?? t("scanFailed") });
          return;
        }

        setResult({
          trackingId,
          shipment: json.data.shipment,
          scanLog: json.data.scanLog,
          otpSent: json.data.otpSent,
        });

        await stopCamera();
      } catch {
        setError({ message: t("networkError") });
      } finally {
        setScanning(false);
        processingRef.current = false;
      }
    },
    [pickupPointId, stopCamera, t]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    setResult(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => void processScan(decodedText),
        () => {}
      );

      setCameraActive(true);
    } catch {
      setError({ message: t("cameraError") });
    }
  }, [processScan, t]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (trimmed) void processScan(trimmed);
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setManualInput("");
  }

  return (
    <div className="space-y-6">
      <CardShell>
        <CardHeader title={t("scanQrCode")} />
        <CardBody>
          <div className="flex flex-col items-center gap-6">
            <div
              id={QR_READER_ID}
              className={cn(
                "mx-auto w-full max-w-sm overflow-hidden rounded-xl",
                !cameraActive && "hidden"
              )}
            />
            {!cameraActive && !result && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="bg-primary-50 flex size-24 items-center justify-center rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="text-primary-500 size-12"
                  >
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <rect x="7" y="7" width="10" height="10" rx="1" />
                  </svg>
                </div>
                <p className="font-body text-text-muted text-center text-lg">
                  {t("cameraInstructions")}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => void startCamera()}
                >
                  {t("startCamera")}
                </Button>
              </div>
            )}
            {cameraActive && (
              <Button type="button" variant="outline" size="md" onClick={() => void stopCamera()}>
                {t("stopCamera")}
              </Button>
            )}
          </div>
        </CardBody>
      </CardShell>

      {!result && (
        <CardShell>
          <CardHeader title={t("manualEntry")} />
          <CardBody>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 sm:flex-row">
              <Input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={t("trackingIdPlaceholder")}
                aria-label={t("trackingId")}
                className="flex-1"
                disabled={scanning}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={scanning || !manualInput.trim()}
                className="shrink-0"
              >
                {scanning ? t("processing") : t("processParcel")}
              </Button>
            </form>
          </CardBody>
        </CardShell>
      )}

      {error && (
        <CardShell role="alert" aria-live="assertive">
          <div className="flex items-start gap-4 px-7 py-6">
            <div className="bg-error-100 flex size-10 shrink-0 items-center justify-center rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="text-error-600 size-5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-body text-error-700 text-lg font-medium">{t("scanError")}</p>
              <p className="font-body text-error-600 mt-1 text-base">{error.message}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              {t("tryAgain")}
            </Button>
          </div>
        </CardShell>
      )}

      {result && <ScanResultCard result={result} onScanAnother={handleReset} />}
    </div>
  );
}
