// SAFETY: enum casts are backed by DB enum columns
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, FileText, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button, DeliveryModeBadge } from "@/components/atoms";
import { DownloadIcon, PackageIcon, TrackingTruckIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { DataTable } from "@/components/molecules/DataTable";
import { useShipments } from "@/hooks/use-shipments";
import { formatDateTimeMedium, type Locale } from "@/lib/format";
import { ShipmentStatus, type DeliveryMode } from "@/types/enums";
import type { Shipment } from "@/types/shipment";

type DispatchResult = {
  id: string;
  trackingId: string;
  success: boolean;
  error?: string;
  carrierName?: string;
  carrierTrackingNumber?: string;
  labelUrl?: string;
};

type DispatchResponse = {
  succeeded: number;
  failed: number;
  total: number;
  results: DispatchResult[];
};

export function AdminDispatchSection() {
  const t = useTranslations("adminDispatch");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();

  const { data, isLoading } = useShipments({
    status: ShipmentStatus.RECEIVED_AT_ORIGIN,
    pageSize: 100,
  });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<DispatchResponse | null>(null);

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
      // SAFETY: dispatch API always returns { data: DispatchResponse } on success (validated server-side)
      return result.data as DispatchResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setRowSelection({});
      setDispatchResults(data);

      if (data.failed > 0 && data.succeeded === 0) {
        toast.error(t("dispatchError"));
      } else if (data.failed > 0) {
        toast.warning(t("dispatchPartial", { succeeded: data.succeeded, failed: data.failed }));
      } else {
        toast.success(t("dispatchSuccess", { count: data.succeeded }));
      }
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
    setDispatchResults(null);
    dispatchMutation.mutate(selectedIds);
  };

  const handleDownloadLabel = useCallback((shipmentId: string) => {
    window.open(`/api/shipments/${shipmentId}/label`, "_blank");
  }, []);

  const handleDownloadAllLabels = useCallback(
    (results: DispatchResult[]) => {
      const withLabels = results.filter((r) => r.success && r.labelUrl);
      for (const r of withLabels) {
        handleDownloadLabel(r.id);
      }
    },
    [handleDownloadLabel]
  );

  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="text-primary-500 border-border-default h-4 w-4 rounded"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="text-primary-500 border-border-default h-4 w-4 rounded"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "tracking_id",
      header: t("trackingId"),
      cell: ({ row }) => (
        <span className="text-text-primary font-medium">{row.original.tracking_id}</span>
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
      cell: ({ row }) => formatDateTimeMedium(row.original.created_at, locale),
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
            setDispatchResults(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-text-primary text-2xl font-semibold">{t("title")}</h1>
          <p className="text-text-muted mt-1 text-sm">{t("subtitle")}</p>
        </div>

        {selectedIds.length > 0 && (
          <Button onClick={handleDispatch} disabled={dispatchMutation.isPending} className="gap-2">
            <TrackingTruckIcon size={16} />
            {dispatchMutation.isPending
              ? t("dispatching")
              : `${t("dispatchSelected")} (${selectedIds.length})`}
          </Button>
        )}
      </div>

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
                    {internalCount}x {tCommon("deliveryModeLabel.internal")} —{" "}
                    {t("barcelonaDispatch")}
                  </div>
                )}
                {sendcloudCount > 0 && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-violet-700">
                    {sendcloudCount}x {tCommon("deliveryModeLabel.sendcloud")} —{" "}
                    {t("sendcloudDispatch")}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {dispatchResults && (
        <DispatchResultsPanel
          results={dispatchResults}
          t={t}
          onDownloadLabel={handleDownloadLabel}
          onDownloadAll={handleDownloadAllLabels}
          onDismiss={() => setDispatchResults(null)}
        />
      )}

      <DataTable
        columns={columns}
        data={shipments}
        isLoading={isLoading}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={{
          icon: <PackageIcon size={40} />,
          title: t("noShipments"),
          description: t("noShipmentsDesc"),
        }}
      />

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

function DispatchResultsPanel({
  results,
  t,
  onDownloadLabel,
  onDownloadAll,
  onDismiss,
}: {
  results: DispatchResponse;
  t: ReturnType<typeof useTranslations<"adminDispatch">>;
  onDownloadLabel: (shipmentId: string) => void;
  onDownloadAll: (results: DispatchResult[]) => void;
  onDismiss: () => void;
}) {
  const labelsAvailable = results.results.filter((r) => r.success && r.labelUrl);
  const hasLabels = labelsAvailable.length > 0;
  const allSucceeded = results.failed === 0;

  return (
    <div
      className={`rounded-xl border p-5 ${
        allSucceeded
          ? "border-green-200 bg-green-50"
          : results.succeeded === 0
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allSucceeded ? (
            <CheckCircle2 size={20} className="text-green-600" />
          ) : (
            <AlertTriangle size={20} className="text-amber-600" />
          )}
          <h3 className="text-text-primary font-semibold">{t("resultsTitle")}</h3>
          <span className="text-text-light text-sm">
            ({t("resultsCount", { succeeded: results.succeeded, failed: results.failed })})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasLabels && labelsAvailable.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onDownloadAll(results.results)}
            >
              <DownloadIcon size={14} />
              {t("downloadAllLabels", { count: labelsAvailable.length })}
            </Button>
          )}
          <button
            onClick={onDismiss}
            className="text-text-muted hover:text-text-light rounded-lg p-1 hover:bg-white/50"
          >
            <XCircle size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {results.results.map((result) => (
          <div
            key={result.id}
            className="flex items-center justify-between rounded-lg bg-white/70 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
              <span className="font-mono text-sm font-medium">{result.trackingId}</span>
              {result.carrierName && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                  {result.carrierName}
                </span>
              )}
              {result.carrierTrackingNumber && (
                <span className="text-text-muted text-xs">{result.carrierTrackingNumber}</span>
              )}
              {result.error && <span className="text-xs text-red-600">{result.error}</span>}
            </div>

            {result.success && result.labelUrl && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => onDownloadLabel(result.id)}
              >
                <FileText size={14} />
                {t("downloadLabel")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
