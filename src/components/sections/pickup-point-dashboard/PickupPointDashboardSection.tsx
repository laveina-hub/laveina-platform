// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Box, Package, QrCode, ShieldCheck, TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/atoms";
import { DataTable } from "@/components/molecules/DataTable";
import { usePickupPointId } from "@/hooks/use-pickup-point-id";
import { useShipments } from "@/hooks/use-shipments";
import { Link } from "@/i18n/navigation";
import type { ShipmentStatus } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function PickupPointDashboardSection() {
  const t = useTranslations("pickupPointDashboard");
  const tStatus = useTranslations("shipmentStatus");
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
        <span className="font-medium text-gray-900">{row.original.tracking_id}</span>
      ),
    },
    {
      accessorKey: "sender_name",
      header: t("sender"),
    },
    {
      accessorKey: "receiver_name",
      header: t("receiver"),
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
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ];

  if (!pickupPointId && !loadingPpId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package size={48} className="mb-4 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-900">{t("noParcels")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("noParcelsDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={t("todayIncoming")}
          value={todayIncoming}
          icon={<Box size={20} className="text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          label={t("readyForPickup")}
          value={readyForPickup}
          icon={<Package size={20} className="text-orange-600" />}
          bg="bg-orange-50"
        />
        <StatCard
          label={t("deliveredToday")}
          value={deliveredToday}
          icon={<TruckIcon size={20} className="text-green-600" />}
          bg="bg-green-50"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/pickup-point/scan"
            className="hover:border-primary-300 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm"
          >
            <div className="bg-primary-50 flex h-10 w-10 items-center justify-center rounded-lg">
              <QrCode size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t("scanQr")}</p>
              <p className="text-xs text-gray-500">{t("scanQrDesc")}</p>
            </div>
          </Link>
          <Link
            href="/pickup-point/verify"
            className="hover:border-primary-300 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t("verifyDelivery")}</p>
              <p className="text-xs text-gray-500">{t("verifyDeliveryDesc")}</p>
            </div>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">{t("pendingParcels")}</h2>
        <DataTable
          columns={columns}
          data={pendingParcels}
          isLoading={isLoading}
          emptyState={{
            icon: <Package size={40} />,
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
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
