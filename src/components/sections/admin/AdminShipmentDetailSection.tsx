// SAFETY: enum casts are backed by DB enum columns
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Clock, Download, MapPin, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button, StatusBadge, DeliveryModeBadge } from "@/components/atoms";
import { WEIGHT_TIERS } from "@/constants/parcel-sizes";
import { useShipment } from "@/hooks/use-shipments";
import { Link } from "@/i18n/navigation";
import type { ShipmentStatus, DeliveryMode } from "@/types/enums";

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(
    cents / 100
  );
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

type Props = {
  shipmentId: string;
};

export function AdminShipmentDetailSection({ shipmentId }: Props) {
  const t = useTranslations("adminShipments");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
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
          <ArrowLeft size={20} />
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
                <Download size={14} />
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
              value={`${shipment.sender_name} (${shipment.sender_phone})`}
            />
            <InfoRow
              label={t("receiver")}
              value={`${shipment.receiver_name} (${shipment.receiver_phone})`}
            />
            <InfoRow label={t("date")} value={formatDateTime(shipment.created_at)} />
          </dl>
        </div>

        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">{t("routeInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-green-500" />
              <div>
                <dt className="text-text-muted text-xs">{t("origin")}</dt>
                <dd className="text-text-primary font-medium">
                  {shipment.origin_pickup_point?.name ?? "—"}{" "}
                  <span className="text-text-muted">({shipment.origin_postcode})</span>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-red-500" />
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

        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">{t("parcelInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow
              label={t("size")}
              value={(() => {
                const tier = WEIGHT_TIERS.find((t) => t.size === shipment.parcel_size);
                return tier ? `${tier.minWeightKg}–${tier.maxWeightKg} kg` : shipment.parcel_size;
              })()}
            />
            <InfoRow
              label={t("weight")}
              value={
                shipment.billable_weight_kg > shipment.weight_kg
                  ? tCommon("billableWeight", {
                      weight: shipment.weight_kg,
                      billable: shipment.billable_weight_kg,
                    })
                  : tCommon("weightKg", { value: shipment.weight_kg })
              }
            />
            <InfoRow label={t("deliverySpeed")} value={shipment.delivery_speed} />
            {shipment.carrier_name && (
              <InfoRow label={t("carrier")} value={shipment.carrier_name} />
            )}
            {shipment.carrier_tracking_number && (
              <InfoRow label={t("carrierTracking")} value={shipment.carrier_tracking_number} />
            )}
            {shipment.sendcloud_parcel_id && (
              <InfoRow
                label={t("sendcloudParcelId")}
                value={String(shipment.sendcloud_parcel_id)}
              />
            )}
          </dl>
        </div>

        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">{t("pricingInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow
              label={t("shipping")}
              value={formatCents(shipment.price_cents - (shipment.insurance_surcharge_cents ?? 0))}
            />
            <InfoRow
              label={t("insurance")}
              value={formatCents(shipment.insurance_surcharge_cents ?? 0)}
            />
            <div className="border-border-muted border-t pt-3">
              <InfoRow label={t("total")} value={formatCents(shipment.price_cents)} bold />
            </div>
          </dl>
        </div>
      </div>

      <div className="border-border-default rounded-xl border bg-white p-5">
        <h2 className="text-text-primary mb-4 text-base font-semibold">{t("scanLog")}</h2>
        {shipment.scan_logs && shipment.scan_logs.length > 0 ? (
          <div className="space-y-4">
            {shipment.scan_logs
              .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
              .map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary-500 mt-1 h-2.5 w-2.5 rounded-full" />
                    {i < shipment.scan_logs.length - 1 && (
                      <div className="bg-border-default h-8 w-px" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={log.new_status as ShipmentStatus}
                        label={tStatus(log.new_status as ShipmentStatus)}
                      />
                    </div>
                    <p className="text-text-muted mt-1 flex items-center gap-1 text-xs">
                      <Clock size={12} />
                      {formatDateTime(log.scanned_at)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm">{t("noScans")}</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className={bold ? "text-text-primary font-semibold" : "text-text-primary"}>{value}</dd>
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
