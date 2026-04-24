"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button, Input } from "@/components/atoms";
import { MapPinIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { DataTable } from "@/components/molecules/DataTable";
import { CsvImportDialog } from "@/components/sections/admin/CsvImportDialog";
import { useAdminPickupPoints, type PickupPointFilters } from "@/hooks/use-pickup-points";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PickupPoint } from "@/types/pickup-point";

export function AdminPickupPointsSection() {
  const t = useTranslations("adminPickupPoints");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<PickupPointFilters>({
    page: 1,
    pageSize: 20,
  });
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading } = useAdminPickupPoints(filters);

  const pickupPoints = data?.data ?? [];

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
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  const columns: ColumnDef<PickupPoint, unknown>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => <span className="text-text-primary font-medium">{row.original.name}</span>,
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
              : "bg-bg-secondary text-text-light ring-border-default hover:bg-bg-muted"
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
          <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
          <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </Button>
          <Link href="/admin/pickup-points/new">
            <Button size="sm" className="gap-2">
              <PlusIcon size={16} />
              {t("addNew")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative max-w-xs">
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

      <DataTable
        columns={columns}
        data={pickupPoints}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/admin/pickup-points/${row.id}`)}
        emptyState={{
          icon: <MapPinIcon size={40} />,
          title: t("noPickupPoints"),
          description: t("noPickupPointsDesc"),
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

      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
