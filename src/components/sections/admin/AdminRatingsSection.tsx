"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { StarIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RATING_STATUSES, type RatingStatus } from "@/validations/rating.schema";

import {
  fetchRatings,
  formatRatingDateTime,
  unwrapOne,
  type AdminRating,
} from "./admin-ratings.data";
import { AdminRatingDialog } from "./AdminRatingDialog";
import { StarsGlyph } from "./StarsGlyph";

const STATUS_STYLES: Record<RatingStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function AdminRatingsSection() {
  const t = useTranslations("adminRatings");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<RatingStatus | "all">("all");
  const [activeRating, setActiveRating] = useState<AdminRating | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "ratings", statusFilter],
    queryFn: () => fetchRatings(statusFilter),
    placeholderData: (prev) => prev,
  });

  const columns: ColumnDef<AdminRating, unknown>[] = [
    {
      id: "shipment",
      header: t("columnSubject"),
      cell: ({ row }) => {
        const shipment = unwrapOne(row.original.shipment);
        const pp = unwrapOne(row.original.pickup_point);
        return (
          <div className="flex flex-col">
            <span className="text-text-primary font-medium">{shipment?.tracking_id ?? "—"}</span>
            <span className="text-text-muted text-xs">{pp?.name ?? ""}</span>
          </div>
        );
      },
    },
    {
      id: "customer",
      header: t("columnCustomer"),
      cell: ({ row }) => {
        const c = unwrapOne(row.original.customer);
        return (
          <div className="flex flex-col">
            <span className="text-text-primary">{c?.full_name ?? "—"}</span>
            <span className="text-text-muted text-xs">{c?.email ?? ""}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "stars",
      header: t("columnStars"),
      cell: ({ row }) => <StarsGlyph stars={row.original.stars} />,
    },
    {
      accessorKey: "status",
      header: t("columnStatus"),
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            STATUS_STYLES[row.original.status]
          )}
        >
          {t(`status.${row.original.status}`)}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("columnDate"),
      cell: ({ row }) => (
        <span className="text-text-muted text-xs">
          {formatRatingDateTime(row.original.created_at, locale)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
        <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) =>
            // SAFETY: <select> options only emit values from RATING_STATUSES or the literal "all".
            setStatusFilter(e.target.value as RatingStatus | "all")
          }
          className="border-border-default focus-visible:ring-primary-500 focus-visible:border-primary-500 rounded-lg border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <option value="all">{t("allStatuses")}</option>
          {RATING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>

      {isError ? (
        <div className="border-error-200 bg-error-50 text-error-700 rounded-xl border p-4 text-sm">
          {t("fetchError")}
        </div>
      ) : null}

      {!isLoading && data && data.length === 0 ? (
        <div className="border-border-default flex flex-col items-center gap-2 rounded-xl border bg-white p-12 text-center">
          <StarIcon size={28} className="text-text-muted" />
          <p className="text-text-primary font-medium">{t("noRatings")}</p>
          <p className="text-text-muted text-sm">{t("noRatingsDesc")}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          onRowClick={(row) => setActiveRating(row)}
        />
      )}

      <AdminRatingDialog
        rating={activeRating}
        onOpenChange={(open) => {
          if (!open) setActiveRating(null);
        }}
        onSaved={(saved) => {
          setActiveRating(saved);
          queryClient.invalidateQueries({ queryKey: ["admin", "ratings"] });
        }}
      />
    </div>
  );
}
