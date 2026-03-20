// SAFETY: `as DeliveryMode` casts in this file are safe because
// values originate from Supabase enum columns that enforce the valid set at the DB level.
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Package, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button, DeliveryModeBadge } from "@/components/atoms";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { DataTable } from "@/components/molecules/DataTable";
import { useShipments } from "@/hooks/use-shipments";
import { ShipmentStatus, type DeliveryMode } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function AdminDispatchSection() {
  const t = useTranslations("adminDispatch");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const { data, isLoading } = useShipments({
    status: ShipmentStatus.RECEIVED_AT_ORIGIN,
    pageSize: 100,
  });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dispatchMutation = useMutation({
    mutationFn: async (shipmentIds: string[]) => {
      const response = await fetch("/api/admin/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentIds }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: "Dispatch failed" }));
        throw new Error(errorBody.error ?? "Dispatch failed");
      }

      const result = await response.json();
      const { succeeded, failed } = result.data;

      if (failed > 0 && succeeded === 0) {
        throw new Error(`All ${failed} dispatch(es) failed`);
      }

      return succeeded as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setRowSelection({});
      toast.success(t("dispatchSuccess", { count }));
    },
    onError: () => {
      toast.error(t("dispatchError"));
    },
  });

  const shipments = data?.data ?? [];

  const selectedIds = Object.keys(rowSelection)
    .filter((key) => rowSelection[key])
    .map((idx) => shipments[parseInt(idx)]?.id)
    .filter(Boolean);

  const handleDispatch = () => {
    if (selectedIds.length === 0) return;
    setConfirmOpen(true);
  };

  const executeDispatch = () => {
    dispatchMutation.mutate(selectedIds);
  };

  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="text-primary-500 h-4 w-4 rounded border-gray-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="text-primary-500 h-4 w-4 rounded border-gray-300"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{row.original.tracking_id}</span>
      ),
    },
    {
      accessorKey: "origin_postcode",
      header: t("origin"),
      cell: ({ row }) => row.original.origin_postcode,
    },
    {
      accessorKey: "destination_postcode",
      header: t("destination"),
      cell: ({ row }) => row.original.destination_postcode,
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
      accessorKey: "parcel_size",
      header: t("size"),
      cell: ({ row }) => (
        <span className="capitalize">{row.original.parcel_size.replace("_", " ")}</span>
      ),
    },
    {
      accessorKey: "weight_kg",
      header: t("weight"),
      cell: ({ row }) => tCommon("weightKg", { value: row.original.weight_kg }),
    },
    {
      accessorKey: "created_at",
      header: t("received"),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="px-3 py-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            dispatchMutation.mutate([row.original.id]);
          }}
          disabled={dispatchMutation.isPending}
        >
          {t("dispatch")}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-2xl font-semibold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {selectedIds.length > 0 && (
          <Button onClick={handleDispatch} disabled={dispatchMutation.isPending} className="gap-2">
            <Truck size={16} />
            {dispatchMutation.isPending
              ? t("dispatching")
              : `${t("dispatchSelected")} (${selectedIds.length})`}
          </Button>
        )}
      </div>

      {/* Info cards for selected items */}
      {selectedIds.length > 0 && (
        <div className="flex gap-3 text-sm">
          {(() => {
            const selected = selectedIds
              .map((id) => shipments.find((s) => s.id === id))
              .filter(Boolean);
            const internalCount = selected.filter((s) => s!.delivery_mode === "internal").length;
            const sendcloudCount = selected.filter((s) => s!.delivery_mode === "sendcloud").length;

            return (
              <>
                {internalCount > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                    {internalCount}x Barcelona — {t("barcelonaDispatch")}
                  </div>
                )}
                {sendcloudCount > 0 && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-700">
                    {sendcloudCount}x SendCloud — {t("sendcloudNotConfigured")}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={shipments}
        isLoading={isLoading}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={{
          icon: <Package size={40} />,
          title: t("noShipments"),
          description: t("noShipmentsDesc"),
        }}
      />

      {/* Confirmation dialog for batch dispatch */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("dispatchSelected")}
        description={t("dispatchConfirmDesc", { count: selectedIds.length })}
        confirmLabel={t("dispatch")}
        cancelLabel={t("cancel")}
        onConfirm={executeDispatch}
        variant="warning"
        loading={dispatchMutation.isPending}
      />
    </div>
  );
}
