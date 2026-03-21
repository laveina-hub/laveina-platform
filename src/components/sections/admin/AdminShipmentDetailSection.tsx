// SAFETY: `as ShipmentStatus` / `as DeliveryMode` casts in this file are safe because
// values originate from Supabase enum columns that enforce the valid set at the DB level.
"use client";

import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusBadge, DeliveryModeBadge } from "@/components/atoms";
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
  const { data: shipment, isLoading } = useShipment(shipmentId);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (!shipment) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p>{t("noShipments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/shipments"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-body text-2xl font-semibold text-gray-900">{t("shipmentDetail")}</h1>
          <p className="text-sm text-gray-500">{shipment.tracking_id}</p>
        </div>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("shipmentInfo")}</h2>
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

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("routeInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-green-500" />
              <div>
                <dt className="text-xs text-gray-500">{t("origin")}</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.origin_pickup_point?.name ?? "—"}{" "}
                  <span className="text-gray-500">({shipment.origin_postcode})</span>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <dt className="text-xs text-gray-500">{t("destination")}</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.destination_pickup_point?.name ?? "—"}{" "}
                  <span className="text-gray-500">({shipment.destination_postcode})</span>
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("parcelInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow label={t("size")} value={shipment.parcel_size} />
            <InfoRow
              label={t("weight")}
              value={tCommon("billableWeight", {
                weight: shipment.weight_kg,
                billable: shipment.billable_weight_kg,
              })}
            />
            <InfoRow label={t("deliverySpeed")} value={shipment.delivery_speed} />
            {shipment.carrier_name && (
              <InfoRow label={t("carrier")} value={shipment.carrier_name} />
            )}
            {shipment.carrier_tracking_number && (
              <InfoRow label={t("carrierTracking")} value={shipment.carrier_tracking_number} />
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("pricingInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow
              label={t("shipping")}
              value={formatCents(shipment.price_cents - (shipment.insurance_surcharge_cents ?? 0))}
            />
            <InfoRow
              label={t("insurance")}
              value={formatCents(shipment.insurance_surcharge_cents ?? 0)}
            />
            <div className="border-t border-gray-100 pt-3">
              <InfoRow label={t("total")} value={formatCents(shipment.price_cents)} bold />
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">{t("scanLog")}</h2>
        {shipment.scan_logs && shipment.scan_logs.length > 0 ? (
          <div className="space-y-4">
            {shipment.scan_logs
              .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
              .map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary-500 mt-1 h-2.5 w-2.5 rounded-full" />
                    {i < shipment.scan_logs.length - 1 && <div className="h-8 w-px bg-gray-200" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={log.new_status as ShipmentStatus}
                        label={tStatus(log.new_status as ShipmentStatus)}
                      />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      {formatDateTime(log.scanned_at)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t("noScans")}</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={bold ? "font-semibold text-gray-900" : "text-gray-900"}>{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}
