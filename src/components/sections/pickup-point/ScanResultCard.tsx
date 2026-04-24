"use client";

import { useTranslations } from "next-intl";

import { Button, CardBody, CardHeader, CardShell } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface ScanResultData {
  shipment: {
    tracking_id: string;
    sender_first_name: string;
    sender_last_name: string;
    receiver_first_name: string;
    receiver_last_name: string;
    parcel_size: string;
  };
  scanLog: {
    old_status: string;
    new_status: string;
  };
  otpSent?: boolean;
}

interface ScanResultCardProps {
  result: ScanResultData;
  onScanAnother: () => void;
}

export function ScanResultCard({ result, onScanAnother }: ScanResultCardProps) {
  const t = useTranslations("scanner");
  const tStatus = useTranslations("shipmentStatus");

  const statusChanged = result.scanLog.old_status !== result.scanLog.new_status;

  return (
    <CardShell>
      <CardHeader title={t("scanResult")} />
      <CardBody>
        <div className="space-y-6">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-5 py-4",
              statusChanged ? "bg-success-50" : "bg-warning-50"
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                statusChanged ? "bg-success-100" : "bg-warning-100"
              )}
            >
              {statusChanged ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-success-600 size-5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-warning-600 size-5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div>
              <p
                className={cn(
                  "font-body text-lg font-medium",
                  statusChanged ? "text-success-700" : "text-warning-700"
                )}
              >
                {statusChanged ? t("statusUpdated") : t("noTransition")}
              </p>
              <p
                className={cn(
                  "font-body text-base",
                  statusChanged ? "text-success-600" : "text-warning-600"
                )}
              >
                {statusChanged
                  ? t("transitionDetail", {
                      from: tStatus(result.scanLog.old_status),
                      to: tStatus(result.scanLog.new_status),
                    })
                  : t("currentStatusIs", { status: tStatus(result.scanLog.old_status) })}
              </p>
            </div>
          </div>

          {result.otpSent && (
            <div className="bg-primary-50 flex items-center gap-3 rounded-xl px-5 py-4">
              <div className="bg-primary-100 flex size-10 shrink-0 items-center justify-center rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-primary-600 size-5"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <p className="font-body text-primary-700 text-base">{t("otpSentToReceiver")}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow label={t("trackingId")} value={result.shipment.tracking_id} />
            <DetailRow label={t("parcelSize")} value={result.shipment.parcel_size} />
            <DetailRow
              label={t("sender")}
              value={`${result.shipment.sender_first_name} ${result.shipment.sender_last_name}`.trim()}
            />
            <DetailRow
              label={t("receiver")}
              value={`${result.shipment.receiver_first_name} ${result.shipment.receiver_last_name}`.trim()}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onScanAnother}
            className="w-full"
          >
            {t("scanAnother")}
          </Button>
        </div>
      </CardBody>
    </CardShell>
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
