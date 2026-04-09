"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/atoms";
import { DataTable } from "@/components/molecules/DataTable";
import { useUsers, type UserFilters } from "@/hooks/use-users";
import { useRouter } from "@/i18n/navigation";
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
        role === "customer" && "bg-gray-50 text-gray-600 ring-gray-500/10"
      )}
    >
      {label}
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function AdminUsersSection() {
  const t = useTranslations("adminUsers");
  const tDashboard = useTranslations("dashboard");
  const router = useRouter();

  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useUsers(filters);

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
            <p className="truncate font-medium text-gray-900">{row.original.full_name}</p>
            <p className="truncate text-xs text-gray-500">{row.original.email}</p>
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
        <span className="text-sm text-gray-700">{row.original.shipment_count}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("joined"),
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">{formatDate(row.original.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{t("totalUsers")}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.total}</p>
          </div>
          {ALL_ROLES.map((role) => (
            <div key={role} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">{roleLabelMap[role]}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {data.data.filter((u) => u.role === role).length > 0
                  ? data.data.filter((u) => u.role === role).length
                  : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

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
          value={filters.role ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              // SAFETY: controlled select
              role: (e.target.value as UserRole) || undefined,
              page: 1,
            }))
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
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
