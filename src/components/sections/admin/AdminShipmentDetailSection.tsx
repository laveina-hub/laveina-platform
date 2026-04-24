// SAFETY: enum casts in this file (status → ShipmentStatus, mode → DeliveryMode)
// are backed by DB CHECK constraints — Supabase's generated Row types already
// restrict the string values to their enum unions.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button, DeliveryModeBadge, StatusBadge } from "@/components/atoms";
import { ChevronIcon, DownloadIcon, MapPinIcon } from "@/components/icons";
import { useShipment } from "@/hooks/use-shipments";
import { Link } from "@/i18n/navigation";
import { formatDateTimeMedium, type Locale } from "@/lib/format";
import type { DeliveryMode, ShipmentStatus } from "@/types/enums";

import { InfoRow, ShipmentParcelPricingCards } from "./ShipmentParcelPricingCards";
import { ShipmentScanLogTimeline } from "./ShipmentScanLogTimeline";

type Props = {
  shipmentId: string;
};

export function AdminShipmentDetailSection({ shipmentId }: Props) {
  const t = useTranslations("adminShipments");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const { data: shipment, isLoading } = useShipment(shipmentId);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shipments/${shipmentId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Cancel failed" }));
        throw new Error(body.error ?? "Cancel failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      toast.success(t("cancelSuccess"));
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shipments/${shipmentId}/sendcloud-sync`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Sync failed" }));
        throw new Error(body.error ?? "Sync failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      const syncData = data.data;
      if (syncData.statusChanged) {
        toast.success(t("syncStatusChanged", { status: syncData.sendcloudStatusMessage }));
      } else {
        toast.info(t("syncNoChange", { status: syncData.sendcloudStatusMessage }));
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!shipment) {
    return (
      <div className="text-text-muted py-16 text-center">
        <p>{t("noShipments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/shipments"
          className="text-text-muted hover:bg-bg-muted hover:text-text-light rounded-lg p-2"
        >
          <ChevronIcon size={20} />
        </Link>
        <div>
          <h1 className="font-body text-text-primary text-2xl font-semibold">
            {t("shipmentDetail")}
          </h1>
          <p className="text-text-muted text-sm">{shipment.tracking_id}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={shipment.status as ShipmentStatus}
            label={tStatus(shipment.status as ShipmentStatus)}
          />
          <DeliveryModeBadge
            mode={shipment.delivery_mode as DeliveryMode}
            label={tCommon(
              `deliveryModeLabel.${shipment.delivery_mode}` as Parameters<typeof tCommon>[0]
            )}
          />
        </div>

        {shipment.sendcloud_parcel_id && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} />
              {t("syncStatus")}
            </Button>
            {shipment.label_url && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  window.open(`/api/shipments/${shipmentId}/label`, "_blank");
                }}
              >
                <DownloadIcon size={14} />
                {t("downloadLabel")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-600 hover:bg-red-50"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <Ban size={14} />
              {t("cancelParcel")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">{t("shipmentInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow label={t("trackingId")} value={shipment.tracking_id} />
            <InfoRow
              label={t("sender")}
              value={`${shipment.sender_first_name} ${shipment.sender_last_name} (${shipment.sender_phone})`}
            />
            <InfoRow
              label={t("receiver")}
              value={`${shipment.receiver_first_name} ${shipment.receiver_last_name} (${shipment.receiver_phone})`}
            />
            <InfoRow label={t("date")} value={formatDateTimeMedium(shipment.created_at, locale)} />
          </dl>
        </div>

        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">{t("routeInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPinIcon size={16} className="mt-0.5 shrink-0 text-green-500" />
              <div>
                <dt className="text-text-muted text-xs">{t("origin")}</dt>
                <dd className="text-text-primary font-medium">
                  {shipment.origin_pickup_point?.name ?? "—"}{" "}
                  <span className="text-text-muted">({shipment.origin_postcode})</span>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPinIcon size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <dt className="text-text-muted text-xs">{t("destination")}</dt>
                <dd className="text-text-primary font-medium">
                  {shipment.destination_pickup_point?.name ?? "—"}{" "}
                  <span className="text-text-muted">({shipment.destination_postcode})</span>
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <ShipmentParcelPricingCards shipment={shipment} />
      </div>

      <ShipmentScanLogTimeline scanLogs={shipment.scan_logs} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer h-8 w-64 rounded" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer border-border-default bg-bg-secondary h-48 rounded-xl border"
          />
        ))}
      </div>
    </div>
  );
}
