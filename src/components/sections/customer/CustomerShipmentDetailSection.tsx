"use client";

import { ArrowLeft, Clock, ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, StatusBadge, DeliveryModeBadge } from "@/components/atoms";
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

export function CustomerShipmentDetailSection({ shipmentId }: Props) {
  const t = useTranslations("customerDashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
  const { data: shipment, isLoading } = useShipment(shipmentId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-8 w-64 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer border-border-default bg-bg-secondary h-40 rounded-xl border"
          />
        ))}
      </div>
    );
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
          href="/customer"
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
        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">{t("shipmentInfo")}</h2>
          <dl className="space-y-3 text-sm">
            <InfoRow label={t("sender")} value={shipment.sender_name} />
            <InfoRow label={t("receiver")} value={shipment.receiver_name} />
            <InfoRow
              label={t("weight")}
              value={tCommon("weightKg", { value: shipment.weight_kg })}
            />
            <InfoRow
              label={t("deliveryMode")}
              value={tCommon(
                `deliveryModeLabel.${shipment.delivery_mode}` as Parameters<typeof tCommon>[0]
              )}
            />
            <InfoRow label={t("deliverySpeed")} value={shipment.delivery_speed} />
            <InfoRow label={t("total")} value={formatCents(shipment.price_cents)} />
          </dl>
        </div>

        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">
            {t("origin")} / {t("destination2")}
          </h2>
          <dl className="space-y-4 text-sm">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-green-500" />
              <div>
                <dt className="text-text-muted text-xs">{t("origin")}</dt>
                <dd className="text-text-primary font-medium">
                  {shipment.origin_pickup_point?.name ?? "—"}
                </dd>
                <dd className="text-text-muted text-xs">
                  {shipment.origin_pickup_point?.address}, {shipment.origin_pickup_point?.city}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <dt className="text-text-muted text-xs">{t("destination2")}</dt>
                <dd className="text-text-primary font-medium">
                  {shipment.destination_pickup_point?.name ?? "—"}
                </dd>
                <dd className="text-text-muted text-xs">
                  {shipment.destination_pickup_point?.address},{" "}
                  {shipment.destination_pickup_point?.city}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {shipment.qr_code_url && (
          <div className="border-border-default rounded-xl border bg-white p-5">
            <h2 className="text-text-primary mb-2 text-base font-semibold">{t("qrCode")}</h2>
            <p className="text-text-muted mb-4 text-xs">{t("qrCodeDesc")}</p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR code is a signed Supabase URL, not optimizable via next/image */}
              <img
                src={shipment.qr_code_url}
                alt="QR Code"
                className="border-border-default h-40 w-40 rounded-lg border"
              />
            </div>
          </div>
        )}

        <div className="border-border-default rounded-xl border bg-white p-5">
          <h2 className="text-text-primary mb-4 text-base font-semibold">
            {t("trackingTimeline")}
          </h2>
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
                    <div>
                      <StatusBadge
                        status={log.new_status as ShipmentStatus}
                        label={tStatus(log.new_status as ShipmentStatus)}
                      />
                      <p className="text-text-muted mt-1 flex items-center gap-1 text-xs">
                        <Clock size={12} />
                        {formatDateTime(log.scanned_at)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">{t("noTracking")}</p>
          )}
        </div>
      </div>

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
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-primary font-medium capitalize">{value}</dd>
    </div>
  );
}
