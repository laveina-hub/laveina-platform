"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MapPin, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button, Input } from "@/components/atoms";
import { DataTable } from "@/components/molecules/DataTable";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

export function AdminPickupPointsSection() {
  const t = useTranslations("adminPickupPoints");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pickup-points", "admin", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      // Admins need to see inactive pickup points too
      const response = await fetch(
        `/api/pickup-points?include_inactive=true${search ? `&search=${encodeURIComponent(search)}` : ""}`
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      return (result.data ?? []) as PickupPoint[];
    },
  });

  const pickupPoints = data ?? [];

  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentActive }: { id: string; currentActive: boolean }) => {
      const response = await fetch(`/api/pickup-points/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-points"] });
      toast.success(t("saved"));
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const columns: ColumnDef<PickupPoint, unknown>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>,
    },
    {
      accessorKey: "address",
      header: t("address"),
    },
    {
      accessorKey: "postcode",
      header: t("postcode"),
    },
    {
      accessorKey: "city",
      header: t("city"),
    },
    {
      accessorKey: "phone",
      header: t("phone"),
      cell: ({ row }) => row.original.phone ?? "—",
    },
    {
      accessorKey: "is_active",
      header: t("status"),
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMutation.mutate({
              id: row.original.id,
              currentActive: row.original.is_active,
            });
          }}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition ring-inset",
            row.original.is_active
              ? "bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100"
              : "bg-gray-50 text-gray-600 ring-gray-500/10 hover:bg-gray-100"
          )}
        >
          {row.original.is_active ? t("active") : t("inactive")}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <Link href="/admin/pickup-points/new">
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            {t("addNew")}
          </Button>
        </Link>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("searchPlaceholder")}
          className="py-2 pl-9 text-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={pickupPoints}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/admin/pickup-points/${row.id}`)}
        emptyState={{
          icon: <MapPin size={40} />,
          title: t("noPickupPoints"),
          description: t("noPickupPointsDesc"),
        }}
      />
    </div>
  );
}
