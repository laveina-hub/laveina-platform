// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, PackageCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { StatusBadge, DeliveryModeBadge } from "@/components/atoms";
import { BoxIcon, MapPinIcon, TrackingTruckIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { useAdminStats, type AdminStats } from "@/hooks/use-admin-stats";
import { useCountUp } from "@/hooks/use-count-up";
import { Link } from "@/i18n/navigation";
import { formatCents, formatDateTimeMedium, type Locale } from "@/lib/format";
import type { ShipmentStatus, DeliveryMode } from "@/types/enums";

type StatIcon = ComponentType<{ size?: number; className?: string }>;

function AnimatedNumber({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated.toLocaleString()}</>;
}

type StatsCardProps = {
  label: string;
  value: string | number;
  icon: StatIcon;
  iconColor: string;
  iconBg: string;
};

function StatsCard({ label, value, icon: Icon, iconColor, iconBg }: StatsCardProps) {
  return (
    <div className="border-border-default shadow-card card-interactive flex items-center gap-4 rounded-xl border bg-white p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="text-text-muted text-sm">{label}</p>
        <p className="text-text-primary text-2xl font-semibold">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
        </p>
      </div>
    </div>
  );
}

type RecentShipment = AdminStats["recentShipments"][number];

export function AdminOverviewSection() {
  const t = useTranslations("adminOverview");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;
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
      cell: ({ row }) => formatDateTimeMedium(row.original.created_at, locale),
    },
  ];

  if (isLoading || !stats) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-text-primary text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label={t("totalShipments")}
          value={stats.totalShipments}
          icon={BoxIcon}
          iconColor="text-primary-600"
          iconBg="bg-primary-50"
        />
        <StatsCard
          label={t("inTransit")}
          value={stats.inTransit}
          icon={TrackingTruckIcon}
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="border-border-default shadow-card rounded-xl border bg-white p-4 text-center">
          <p className="text-text-primary text-2xl font-semibold">{stats.waitingAtOrigin}</p>
          <p className="text-text-muted mt-1 text-xs">{t("waitingAtOrigin")}</p>
        </div>
        <div className="border-border-default shadow-card rounded-xl border bg-white p-4 text-center">
          <p className="text-text-primary text-2xl font-semibold">{stats.receivedAtOrigin}</p>
          <p className="text-text-muted mt-1 text-xs">{t("receivedAtOrigin")}</p>
        </div>
        <div className="border-border-default shadow-card rounded-xl border bg-white p-4 text-center">
          <p className="text-text-primary text-2xl font-semibold">{stats.delivered}</p>
          <p className="text-text-muted mt-1 text-xs">{t("delivered")}</p>
        </div>
        <div className="border-border-default shadow-card rounded-xl border bg-white p-4 text-center">
          <p className="text-text-primary text-2xl font-semibold">{stats.activePickupPoints}</p>
          <p className="text-text-muted mt-1 text-xs">{t("activePickupPoints")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/dispatch"
          className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
        >
          <TrackingTruckIcon size={16} />
          {t("goToDispatch")}
        </Link>
        <Link
          href="/admin/shipments"
          className="border-border-default text-text-primary hover:bg-bg-muted inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:shadow-xs active:scale-[0.98]"
        >
          <BoxIcon size={16} />
          {t("viewAllShipments")}
        </Link>
        <Link
          href="/admin/pickup-points"
          className="border-border-default text-text-primary hover:bg-bg-muted inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:shadow-xs active:scale-[0.98]"
        >
          <MapPinIcon size={16} />
          {t("managePickupPoints")}
        </Link>
      </div>

      <div>
        <h2 className="text-text-primary mb-3 text-lg font-semibold">{t("recentShipments")}</h2>
        <DataTable
          columns={columns}
          data={stats.recentShipments}
          emptyState={{ title: t("noShipments"), description: t("noShipmentsDesc") }}
        />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton-shimmer h-8 w-48 rounded" />
        <div className="skeleton-shimmer mt-2 h-4 w-72 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer border-border-default h-24 rounded-xl border bg-white"
          />
        ))}
      </div>
      <div className="border-border-default rounded-xl border bg-white">
        <div className="divide-border-muted divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="skeleton-shimmer h-12 w-12 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                <div className="skeleton-shimmer h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
