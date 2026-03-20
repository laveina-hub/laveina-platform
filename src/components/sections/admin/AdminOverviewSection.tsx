// SAFETY: `as ShipmentStatus` / `as DeliveryMode` casts in this file are safe because
// values originate from Supabase enum columns that enforce the valid set at the DB level.
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Box, DollarSign, MapPin, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusBadge, DeliveryModeBadge } from "@/components/atoms";
import { DataTable } from "@/components/molecules/DataTable";
import { useAdminStats, type AdminStats } from "@/hooks/use-admin-stats";
import { Link } from "@/i18n/navigation";
import type { ShipmentStatus, DeliveryMode } from "@/types/enums";

// ─── Stats Card ──────────────────────────────────────────────────────────────

type StatsCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
};

function StatsCard({ label, value, icon: Icon, iconColor, iconBg }: StatsCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// ─── Recent shipment row type ────────────────────────────────────────────────

type RecentShipment = AdminStats["recentShipments"][number];

// ─── Main Section ────────────────────────────────────────────────────────────

export function AdminOverviewSection() {
  const t = useTranslations("adminOverview");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
  const { data: stats, isLoading } = useAdminStats();

  const columns: ColumnDef<RecentShipment, unknown>[] = [
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => (
        <Link
          href={`/admin/shipments/${row.original.id}`}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          {row.original.tracking_id}
        </Link>
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
      accessorKey: "delivery_mode",
      header: t("mode"),
      cell: ({ row }) => (
        <DeliveryModeBadge
          mode={row.original.delivery_mode as DeliveryMode}
          label={tCommon(
            `deliveryModeLabel.${row.original.delivery_mode}` as Parameters<typeof tCommon>[0]
          )}
        />
      ),
    },
    {
      accessorKey: "price_cents",
      header: t("price"),
      cell: ({ row }) => formatCents(row.original.price_cents),
    },
    {
      accessorKey: "created_at",
      header: t("date"),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ];

  if (isLoading || !stats) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("totalShipments")}
          value={stats.totalShipments}
          icon={Box}
          iconColor="text-primary-600"
          iconBg="bg-primary-50"
        />
        <StatsCard
          label={t("inTransit")}
          value={stats.inTransit}
          icon={Truck}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatsCard
          label={t("readyForPickup")}
          value={stats.readyForPickup}
          icon={PackageCheck}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
        <StatsCard
          label={t("revenue")}
          value={formatCents(stats.totalRevenueCents)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.waitingAtOrigin}</p>
          <p className="mt-1 text-xs text-gray-500">{t("waitingAtOrigin")}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.receivedAtOrigin}</p>
          <p className="mt-1 text-xs text-gray-500">{t("receivedAtOrigin")}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.delivered}</p>
          <p className="mt-1 text-xs text-gray-500">{t("delivered")}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.activePickupPoints}</p>
          <p className="mt-1 text-xs text-gray-500">{t("activePickupPoints")}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/dispatch"
          className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition"
        >
          <Truck size={16} />
          {t("goToDispatch")}
        </Link>
        <Link
          href="/admin/shipments"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <Box size={16} />
          {t("viewAllShipments")}
        </Link>
        <Link
          href="/admin/pickup-points"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <MapPin size={16} />
          {t("managePickupPoints")}
        </Link>
      </div>

      {/* Recent shipments */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">{t("recentShipments")}</h2>
        <DataTable
          columns={columns}
          data={stats.recentShipments}
          emptyState={{ title: t("noShipments"), description: t("noShipmentsDesc") }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
    </div>
  );
}
