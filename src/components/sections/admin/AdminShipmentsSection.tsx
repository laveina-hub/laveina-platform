// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Box, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/atoms";
import { StatusBadge, DeliveryModeBadge } from "@/components/atoms";
import { DataTable } from "@/components/molecules/DataTable";
import { useShipments, type ShipmentFilters } from "@/hooks/use-shipments";
import { useRouter } from "@/i18n/navigation";
import { ShipmentStatus, type DeliveryMode } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

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
    year: "numeric",
  }).format(new Date(dateStr));
}

const ALL_STATUSES = Object.values(ShipmentStatus);

export function AdminShipmentsSection() {
  const t = useTranslations("adminShipments");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
  const router = useRouter();

  const [filters, setFilters] = useState<ShipmentFilters>({
    page: 1,
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError } = useShipments(filters);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => (
        <span className="text-primary-600 font-medium">{row.original.tracking_id}</span>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("searchPlaceholder")}
            className="py-2 pl-9 text-sm"
          />
        </div>

        <select
          value={filters.status ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: (e.target.value as ShipmentStatus) || undefined,
              page: 1,
            }))
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="">{t("allStatuses")}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} className="shrink-0" />
          {t("fetchError")}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/admin/shipments/${row.id}`)}
        emptyState={{
          icon: <Box size={40} />,
          title: t("noShipments"),
          description: t("noShipmentsDesc"),
        }}
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: (page) => setFilters((prev) => ({ ...prev, page })),
              }
            : undefined
        }
      />
    </div>
  );
}
