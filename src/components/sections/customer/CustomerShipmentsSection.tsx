// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button, Input, StatusBadge } from "@/components/atoms";
import { ChevronIcon, PackageIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { useAuth } from "@/hooks/use-auth";
import { useShipments } from "@/hooks/use-shipments";
import { Link, useRouter } from "@/i18n/navigation";
import { formatCents, formatDateMedium, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShipmentStatus } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

// A11 (client answer 2026-04-21): Active tab = non-delivered + delivered
// within the last 7 days. The 7-day tail is enforced server-side in
// `listShipments` via a PostgREST `.or()` clause (Q14.3); this component
// just signals intent with `active: true`.

type TabKey = "active" | "delivered" | "all";

type TabDef = {
  key: TabKey;
  labelKey: string;
};

const TABS: readonly TabDef[] = [
  { key: "active", labelKey: "tabActive" },
  { key: "delivered", labelKey: "tabDelivered" },
  { key: "all", labelKey: "tabAll" },
];

export function CustomerShipmentsSection() {
  const t = useTranslations("customerDashboard");
  const tStatus = useTranslations("shipmentStatus");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<TabKey>("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search input so the list query doesn't re-fire on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // Reset pagination when the user switches tabs.
  useEffect(() => {
    setPage(1);
  }, [tab]);

  const queryFilters = useMemo(
    () => ({
      customerId: user?.id,
      page,
      pageSize: 20,
      search: search || undefined,
      ...(tab === "delivered"
        ? { status: ShipmentStatus.DELIVERED }
        : tab === "active"
          ? { active: true }
          : {}),
    }),
    [user?.id, page, search, tab]
  );

  const { data, isLoading } = useShipments(queryFilters, { enabled: !!user });

  const showLoading = authLoading || isLoading || !data;

  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => (
        <span className="text-primary-600 font-medium">{row.original.tracking_id}</span>
      ),
    },
    {
      accessorKey: "destination_postcode",
      header: t("destination"),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
          <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Link href="/book">
          <Button size="sm" className="gap-2">
            <PlusIcon size={16} />
            {t("bookShipment")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label={t("tabAriaLabel")}
          className="border-border-default inline-flex rounded-lg border bg-white p-1"
        >
          {TABS.map((tabDef) => {
            const isActive = tab === tabDef.key;
            return (
              <button
                key={tabDef.key}
                type="button"
                onClick={() => setTab(tabDef.key)}
                aria-pressed={isActive}
                className={cn(
                  "focus-visible:outline-primary-500 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {t(tabDef.labelKey)}
              </button>
            );
          })}
        </nav>

        <label className="relative block sm:w-72">
          <span className="sr-only">{t("searchPlaceholder")}</span>
          <SearchIcon
            size={14}
            className="text-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={showLoading}
        onRowClick={(row) => router.push(`/customer/shipments/${row.id}`)}
        emptyState={{
          icon: <PackageIcon size={40} />,
          title: t("noShipments"),
          description: t("noShipmentsDesc"),
          action: (
            <Link href="/book">
              <Button size="sm" className="gap-2">
                {t("bookShipment")}
                <ChevronIcon direction="right" size={16} />
              </Button>
            </Link>
          ),
        }}
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
