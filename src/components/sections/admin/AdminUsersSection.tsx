"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/atoms";
import { SearchIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useUsers, type UserFilters } from "@/hooks/use-users";
import { useRouter } from "@/i18n/navigation";
import { formatDateMedium, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/enums";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  created_at: string;
  shipment_count: number;
};

const ALL_ROLES = Object.values(UserRole);

function RoleBadge({ role, label }: { role: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        role === "admin" && "bg-purple-50 text-purple-700 ring-purple-600/20",
        role === "pickup_point" && "bg-blue-50 text-blue-700 ring-blue-600/20",
        role === "customer" && "bg-bg-secondary text-text-light ring-border-default"
      )}
    >
      {label}
    </span>
  );
}

export function AdminUsersSection() {
  const t = useTranslations("adminUsers");
  const tDashboard = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useUsers(filters);

  // Pagination is in-place state, not a route change, so reset window scroll
  // when the page index changes.
  useScrollToTop(filters.page);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  const roleLabelMap: Record<string, string> = {
    admin: tDashboard("roleAdmin"),
    pickup_point: tDashboard("rolePickupPoint"),
    customer: tDashboard("roleCustomer"),
  };

  const columns: ColumnDef<UserRow, unknown>[] = [
    {
      accessorKey: "full_name",
      header: t("name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="bg-primary-500 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
            {row.original.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-text-primary truncate font-medium">{row.original.full_name}</p>
            <p className="text-text-muted truncate text-xs">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: t("role"),
      cell: ({ row }) => (
        <RoleBadge
          role={row.original.role}
          label={roleLabelMap[row.original.role] ?? row.original.role}
        />
      ),
    },
    {
      accessorKey: "phone",
      header: t("phone"),
      cell: ({ row }) => row.original.phone ?? "—",
    },
    {
      accessorKey: "shipment_count",
      header: t("shipments"),
      cell: ({ row }) => (
        <span className="text-text-secondary text-sm">{row.original.shipment_count}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("joined"),
      cell: ({ row }) => (
        <span className="text-text-muted text-sm">
          {formatDateMedium(row.original.created_at, locale)}
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

      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-border-default rounded-xl border bg-white p-4">
            <p className="text-text-muted text-sm">{t("totalUsers")}</p>
            <p className="text-text-primary mt-1 text-2xl font-semibold">{data.total}</p>
          </div>
          {ALL_ROLES.map((role) => (
            <div key={role} className="border-border-default rounded-xl border bg-white p-4">
              <p className="text-text-muted text-sm">{roleLabelMap[role]}</p>
              <p className="text-text-primary mt-1 text-2xl font-semibold">
                {data.roleCounts[role] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

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
          value={filters.role ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              // SAFETY: controlled select
              role: (e.target.value as UserRole) || undefined,
              page: 1,
            }))
          }
          className="border-border-default text-text-secondary rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <option value="">{t("allRoles")}</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabelMap[r]}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        emptyState={{
          icon: <Users size={40} />,
          title: t("noUsers"),
          description: t("noUsersDesc"),
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
