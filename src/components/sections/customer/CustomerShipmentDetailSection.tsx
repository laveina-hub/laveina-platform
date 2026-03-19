// SAFETY: `as ShipmentStatus` / `as DeliveryMode` casts in this file are safe because
// values originate from Supabase enum columns that enforce the valid set at the DB level.
"use client";

import { ArrowLeft, Clock, ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, StatusBadge, DeliveryModeBadge } from "@/components/atoms";
import { useShipment } from "@/hooks/use-shipments";
import { Link } from "@/i18n/navigation";
import type { ShipmentStatus, DeliveryMode } from "@/types/enums";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("es-ES", {
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

export function CustomerShipmentDetailSection({ shipmentId }: Props) {
  const t = useTranslations("customerDashboard");
  const tStatus = useTranslations("shipmentStatus");
  const { data: shipment, isLoading } = useShipment(shipmentId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    );
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
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/customer"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-body text-2xl font-semibold text-gray-900">{t("shipmentDetail")}</h1>
          <p className="text-sm text-gray-500">{shipment.tracking_id}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={shipment.status as ShipmentStatus}
          label={tStatus(shipment.status as ShipmentStatus)}
        />
        <DeliveryModeBadge mode={shipment.delivery_mode as DeliveryMode} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipment info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("shipmentInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow label={t("sender")} value={shipment.sender_name} />
            <InfoRow label={t("receiver")} value={shipment.receiver_name} />
            <InfoRow label={t("size")} value={shipment.parcel_size} />
            <InfoRow label={t("weight")} value={`${shipment.weight_kg} kg`} />
            <InfoRow
              label={t("deliveryMode")}
              value={shipment.delivery_mode === "internal" ? "Barcelona" : "SendCloud"}
            />
            <InfoRow label={t("deliverySpeed")} value={shipment.delivery_speed} />
            <InfoRow label={t("total")} value={formatCents(shipment.price_cents)} />
          </dl>
        </div>

        {/* Route */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {t("origin")} / {t("destination2")}
          </h2>
          <dl className="space-y-4 text-sm">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-green-500" />
              <div>
                <dt className="text-xs text-gray-500">{t("origin")}</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.origin_pickup_point?.name ?? "—"}
                </dd>
                <dd className="text-xs text-gray-500">
                  {shipment.origin_pickup_point?.address}, {shipment.origin_pickup_point?.city}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <dt className="text-xs text-gray-500">{t("destination2")}</dt>
                <dd className="font-medium text-gray-900">
                  {shipment.destination_pickup_point?.name ?? "—"}
                </dd>
                <dd className="text-xs text-gray-500">
                  {shipment.destination_pickup_point?.address},{" "}
                  {shipment.destination_pickup_point?.city}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* QR Code */}
        {shipment.qr_code_url && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-2 text-base font-semibold text-gray-900">{t("qrCode")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("qrCodeDesc")}</p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR code is a signed Supabase URL, not optimizable via next/image */}
              <img
                src={shipment.qr_code_url}
                alt="QR Code"
                className="h-40 w-40 rounded-lg border border-gray-200"
              />
            </div>
          </div>
        )}

        {/* Tracking timeline */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("trackingTimeline")}</h2>
          {shipment.scan_logs && shipment.scan_logs.length > 0 ? (
            <div className="space-y-4">
              {shipment.scan_logs
                .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
                .map((log, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="bg-primary-500 mt-1 h-2.5 w-2.5 rounded-full" />
                      {i < shipment.scan_logs.length - 1 && (
                        <div className="h-8 w-px bg-gray-200" />
                      )}
                    </div>
                    <div>
                      <StatusBadge
                        status={log.new_status as ShipmentStatus}
                        label={tStatus(log.new_status as ShipmentStatus)}
                      />
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {formatDateTime(log.scanned_at)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("noTracking")}</p>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex gap-3">
        <Link href={`/tracking/${shipment.tracking_id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink size={14} />
            {t("viewTracking")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 capitalize">{value}</dd>
    </div>
  );
}
