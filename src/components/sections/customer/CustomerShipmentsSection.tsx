// SAFETY: enum casts are backed by DB enum columns
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Package, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, StatusBadge } from "@/components/atoms";
import { DataTable } from "@/components/molecules/DataTable";
import { useAuth } from "@/hooks/use-auth";
import { useShipments } from "@/hooks/use-shipments";
import { Link, useRouter } from "@/i18n/navigation";
import type { ShipmentStatus } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(
    cents / 100
  );
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function CustomerShipmentsSection() {
  const t = useTranslations("customerDashboard");
  const tStatus = useTranslations("shipmentStatus");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useShipments(
    user ? { customerId: user.id, page, pageSize: 20 } : { page, pageSize: 20 },
    { enabled: !!user }
  );

  // Show loading until the query has actually returned data.
  // Covers: auth loading, query fetching, and the one-frame gap where
  // TanStack Query hasn't started fetching the new query key yet.
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
      cell: ({ row }) => formatDate(row.original.created_at),
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
            <Plus size={16} />
            {t("bookShipment")}
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={showLoading}
        onRowClick={(row) => router.push(`/customer/shipments/${row.id}`)}
        emptyState={{
          icon: <Package size={40} />,
          title: t("noShipments"),
          description: t("noShipmentsDesc"),
          action: (
            <Link href="/book">
              <Button size="sm" className="gap-2">
                {t("bookShipment")}
                <ArrowRight size={16} />
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
