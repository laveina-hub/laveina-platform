// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { DeliveryModeBadge, DeliverySpeedBadge, Input, StatusBadge } from "@/components/atoms";
import { BoxIcon, SearchIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { useShipments, type ShipmentFilters } from "@/hooks/use-shipments";
import { useRouter } from "@/i18n/navigation";
import { formatCents, formatDateMedium, type Locale } from "@/lib/format";
import { ShipmentStatus, type DeliveryMode, type DeliverySpeed } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

type ParcelPresetKey = "mini" | "small" | "medium" | "large";
const PRESET_KEYS: readonly ParcelPresetKey[] = ["mini", "small", "medium", "large"];

const ALL_STATUSES = Object.values(ShipmentStatus);

export function AdminShipmentsSection() {
  const t = useTranslations("adminShipments");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;
  const tSpeed = useTranslations("deliverySpeed");
  const tPresets = useTranslations("parcelPresets");
  const router = useRouter();

  const [filters, setFilters] = useState<ShipmentFilters>({
    page: 1,
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError } = useShipments(filters);

  // Count siblings per Stripe checkout session so the list can surface a
  // "×N" badge for multi-parcel bookings. Scoped to the current page — two
  // siblings on different pages would under-count, acceptable for MVP.
  const siblingCounts = new Map<string, number>();
  for (const row of data?.data ?? []) {
    const key = row.stripe_checkout_session_id;
    if (!key) continue;
    siblingCounts.set(key, (siblingCounts.get(key) ?? 0) + 1);
  }

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => {
        const session = row.original.stripe_checkout_session_id;
        const count = session ? (siblingCounts.get(session) ?? 0) : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-primary-600 font-medium">{row.original.tracking_id}</span>
            {count > 1 ? (
              <span
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset"
                title={t("parcelsInBookingLong", { count })}
              >
                {t("parcelsInBooking", { count })}
              </span>
            ) : null}
          </div>
        );
      },
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
      id: "size",
      header: t("size"),
      cell: ({ row }) => {
        const slug = row.original.parcel_preset_slug;
        if (slug && (PRESET_KEYS as readonly string[]).includes(slug)) {
          return (
            <span className="text-text-primary">{tPresets(`${slug as ParcelPresetKey}.name`)}</span>
          );
        }
        return <span className="text-text-muted">{row.original.parcel_size}</span>;
      },
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
      accessorKey: "delivery_speed",
      header: t("speed"),
      cell: ({ row }) => {
        const speed = row.original.delivery_speed as DeliverySpeed;
        return <DeliverySpeedBadge speed={speed} label={tSpeed(speed)} />;
      },
    },
    {
      accessorKey: "price_cents",
      header: t("price"),
      cell: ({ row }) => formatCents(row.original.price_cents),
    },
    {
      accessorKey: "created_at",
      header: t("date"),
      cell: ({ row }) => formatDateMedium(row.original.created_at, locale),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon
            size={16}
            className="text-text-muted absolute top-1/2 left-3 -translate-y-1/2"
          />
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
          className="border-border-default text-text-secondary rounded-lg border bg-white px-3 py-2 text-sm"
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
          icon: <BoxIcon size={40} />,
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
