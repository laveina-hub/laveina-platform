"use client";

// SAFETY: `new_status as ShipmentStatus` is backed by the DB CHECK constraint
// on `scan_logs.new_status` — Supabase's generated Row type already restricts
// the string to the 7 status enum values.

import { useLocale, useTranslations } from "next-intl";

import { StatusBadge } from "@/components/atoms";
import { ClockIcon } from "@/components/icons";
import { formatDateTimeMedium, type Locale } from "@/lib/format";
import type { ShipmentStatus } from "@/types/enums";
import type { ShipmentWithRelations } from "@/types/shipment";

type Props = {
  scanLogs: ShipmentWithRelations["scan_logs"];
};

/** Vertical scan-event timeline for the admin shipment detail page. */
export function ShipmentScanLogTimeline({ scanLogs }: Props) {
  const t = useTranslations("adminShipments");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;

  return (
    <div className="border-border-default rounded-xl border bg-white p-5">
      <h2 className="text-text-primary mb-4 text-base font-semibold">{t("scanLog")}</h2>
      {scanLogs && scanLogs.length > 0 ? (
        <div className="space-y-4">
          {scanLogs
            .slice()
            .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
            .map((log, i) => (
              <div key={log.id ?? i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="bg-primary-500 mt-1 h-2.5 w-2.5 rounded-full" />
                  {i < scanLogs.length - 1 && <div className="bg-border-default h-8 w-px" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={log.new_status as ShipmentStatus}
                      label={tStatus(log.new_status as ShipmentStatus)}
                    />
                  </div>
                  <p className="text-text-muted mt-1 flex items-center gap-1 text-xs">
                    <ClockIcon size={12} />
                    {formatDateTimeMedium(log.scanned_at, locale)}
                  </p>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-text-muted text-sm">{t("noScans")}</p>
      )}
    </div>
  );
}
