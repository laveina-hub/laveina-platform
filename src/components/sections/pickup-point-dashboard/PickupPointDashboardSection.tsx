// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { QrCode, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { StatusBadge } from "@/components/atoms";
import { BoxIcon, PackageIcon, TrackingTruckIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { usePickupPointId } from "@/hooks/use-pickup-point-id";
import { useShipments } from "@/hooks/use-shipments";
import { Link } from "@/i18n/navigation";
import { formatDateTimeMedium, type Locale } from "@/lib/format";
import type { ShipmentStatus } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

export function PickupPointDashboardSection() {
  const t = useTranslations("pickupPointDashboard");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;
  const { data: pickupPointId, isLoading: loadingPpId } = usePickupPointId();

  const { data: shipments, isLoading: loadingShipments } = useShipments(
    pickupPointId ? { pickupPointId, pageSize: 50 } : {}
  );

  const isLoading = loadingPpId || loadingShipments;
  const allShipments = shipments?.data ?? [];

  const today = new Date().toDateString();
  const todayIncoming = allShipments.filter(
    (s) => s.status === "received_at_origin" && new Date(s.created_at).toDateString() === today
  ).length;
  const readyForPickup = allShipments.filter((s) => s.status === "ready_for_pickup").length;
  const deliveredToday = allShipments.filter(
    (s) =>
      s.status === "delivered" && new Date(s.updated_at ?? s.created_at).toDateString() === today
  ).length;

  const pendingParcels = allShipments.filter(
    (s) => s.status !== "delivered" && s.status !== "payment_confirmed"
  );

  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => (
        <span className="text-text-primary font-medium">{row.original.tracking_id}</span>
      ),
    },
    {
      id: "sender",
      header: t("sender"),
      cell: ({ row }) =>
        `${row.original.sender_first_name} ${row.original.sender_last_name}`.trim(),
    },
    {
      id: "receiver",
      header: t("receiver"),
      cell: ({ row }) =>
        `${row.original.receiver_first_name} ${row.original.receiver_last_name}`.trim(),
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status as ShipmentStatus}
          label={tStatus(row.original.status as ShipmentStatus)}
        />
      ),
    },
    {
      accessorKey: "created_at",
      header: t("date"),
      cell: ({ row }) => formatDateTimeMedium(row.original.created_at, locale),
    },
  ];

  if (!pickupPointId && !loadingPpId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageIcon size={48} className="text-border-default mb-4" />
        <h2 className="text-text-primary text-lg font-semibold">{t("noParcels")}</h2>
        <p className="text-text-muted mt-1 text-sm">{t("noParcelsDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("todayIncoming")}
          value={todayIncoming}
          icon={<BoxIcon size={20} className="text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          label={t("readyForPickup")}
          value={readyForPickup}
          icon={<PackageIcon size={20} className="text-orange-600" />}
          bg="bg-orange-50"
        />
        <StatCard
          label={t("deliveredToday")}
          value={deliveredToday}
          icon={<TrackingTruckIcon size={20} className="text-green-600" />}
          bg="bg-green-50"
        />
      </div>

      <div>
        <h2 className="text-text-light mb-3 text-sm font-semibold">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/pickup-point/scan"
            className="hover:border-primary-300 border-border-default flex items-center gap-4 rounded-xl border bg-white p-4 transition hover:shadow-sm"
          >
            <div className="bg-primary-50 flex h-10 w-10 items-center justify-center rounded-lg">
              <QrCode size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">{t("scanQr")}</p>
              <p className="text-text-muted text-xs">{t("scanQrDesc")}</p>
            </div>
          </Link>
          <Link
            href="/pickup-point/verify"
            className="hover:border-primary-300 border-border-default flex items-center gap-4 rounded-xl border bg-white p-4 transition hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">{t("verifyDelivery")}</p>
              <p className="text-text-muted text-xs">{t("verifyDeliveryDesc")}</p>
            </div>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-text-primary mb-3 text-lg font-semibold">{t("pendingParcels")}</h2>
        <DataTable
          columns={columns}
          data={pendingParcels}
          isLoading={isLoading}
          emptyState={{
            icon: <PackageIcon size={40} />,
            title: t("noParcels"),
            description: t("noParcelsDesc"),
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="border-border-default flex items-center gap-4 rounded-xl border bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      <div>
        <p className="text-text-primary text-2xl font-semibold">{value}</p>
        <p className="text-text-muted text-xs">{label}</p>
      </div>
    </div>
  );
}
