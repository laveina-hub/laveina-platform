"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, FileUp, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/atoms";
import { cn } from "@/lib/utils";
import {
  parseCsvPickupPoints,
  type CsvParseResult,
  type CsvPickupPointRow,
} from "@/validations/pickup-point.schema";

type CsvImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ImportState = "upload" | "preview" | "result";

type ImportResult = {
  inserted: number;
  failed: Array<{ name: string; message: string }>;
  parseErrors: Array<{ row: number; message: string }>;
};

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const t = useTranslations("adminPickupPoints");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportState>("upload");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const resetState = useCallback(() => {
    setStep("upload");
    setParseResult(null);
    setImportResult(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetState();
      onOpenChange(isOpen);
    },
    [onOpenChange, resetState]
  );

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error(t("importFileType"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      const result = parseCsvPickupPoints(text);
      setParseResult(result);
      setStep("preview");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const importMutation = useMutation({
    mutationFn: async (rows: CsvPickupPointRow[]) => {
      const csvLines = [
        "Name,Address,Postcode,City,Latitude,Longitude,Phone,Email,Monday hours,Tuesday hours,Wednesday hours,Thursday hours,Friday hours,Saturday hours,Sunday hours,Map link",
        ...rows.map((r) => {
          const formatDay = (day: string) => {
            const schedule = r.working_hours[day as keyof typeof r.working_hours];
            if (!schedule.open || schedule.slots.length === 0) return "Closed";
            return schedule.slots.map(([s, e]) => `${s}-${e}`).join(" ");
          };
          return [
            r.name,
            r.address,
            r.postcode,
            r.city,
            r.latitude,
            r.longitude,
            r.phone,
            r.email,
            formatDay("monday"),
            formatDay("tuesday"),
            formatDay("wednesday"),
            formatDay("thursday"),
            formatDay("friday"),
            formatDay("saturday"),
            formatDay("sunday"),
            "",
          ].join(",");
        }),
      ].join("\n");

      const response = await fetch("/api/pickup-points/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvLines }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Import failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const result: ImportResult = {
        inserted: data.data?.inserted ?? 0,
        failed: data.data?.failed ?? [],
        parseErrors: data.parseErrors ?? [],
      };
      setImportResult(result);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["pickup-points"] });

      if (result.inserted > 0) {
        toast.success(t("importSuccess", { count: result.inserted }));
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default fixed top-1/2 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white shadow-lg">
          <div className="border-border-muted flex items-center justify-between border-b px-6 py-4">
            <Dialog.Title className="text-text-primary text-lg font-semibold">
              {t("importCsv")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-text-muted hover:bg-bg-muted hover:text-text-light rounded-md p-1"
                aria-label={tCommon("closeDialog")}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            {step === "upload" && (
              <UploadStep
                dragOver={dragOver}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onFileInput={handleFileInput}
                fileInputRef={fileInputRef}
                t={t}
              />
            )}

            {step === "preview" && parseResult && (
              <PreviewStep
                parseResult={parseResult}
                onBack={resetState}
                onImport={() => importMutation.mutate(parseResult.rows)}
                isLoading={importMutation.isPending}
                t={t}
              />
            )}

            {step === "result" && importResult && (
              <ResultStep result={importResult} onClose={() => handleOpenChange(false)} t={t} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UploadStep({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  fileInputRef,
  t,
}: {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-text-muted text-sm">{t("importDescription")}</p>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border-default hover:border-border-default hover:bg-bg-secondary"
        )}
      >
        <Upload size={32} className={cn("text-text-muted", dragOver && "text-primary")} />
        <div className="text-center">
          <p className="text-text-secondary text-sm font-medium">{t("importDragDrop")}</p>
          <p className="text-text-muted mt-1 text-xs">{t("importFileType")}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileInput}
          className="hidden"
        />
      </div>

      <div className="bg-bg-secondary rounded-lg p-4">
        <p className="text-text-light text-xs font-medium">{t("importExpectedFormat")}</p>
        <code className="text-text-muted mt-1 block overflow-x-auto text-xs">
          Name,Address,Postcode,City,Latitude,Longitude,Phone,Email,Monday hours,...
        </code>
      </div>
    </div>
  );
}

function PreviewStep({
  parseResult,
  onBack,
  onImport,
  isLoading,
  t,
}: {
  parseResult: CsvParseResult;
  onBack: () => void;
  onImport: () => void;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const { rows, errors } = parseResult;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5">
          <FileUp size={14} className="text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {t("importRowsFound", { count: rows.length })}
          </span>
        </div>
        {errors.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {t("importRowsSkipped", { count: errors.length })}
            </span>
          </div>
        )}
      </div>

      <p className="text-text-muted text-sm">{t("importDraftNote")}</p>

      <div className="border-border-default overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="text-text-light px-3 py-2 text-left font-medium">{t("name")}</th>
              <th className="text-text-light px-3 py-2 text-left font-medium">{t("city")}</th>
              <th className="text-text-light px-3 py-2 text-left font-medium">{t("postcode")}</th>
              <th className="text-text-light px-3 py-2 text-left font-medium">{t("phone")}</th>
            </tr>
          </thead>
          <tbody className="divide-border-muted divide-y">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-bg-secondary">
                <td className="text-text-primary px-3 py-2 font-medium">{row.name}</td>
                <td className="text-text-light px-3 py-2">{row.city}</td>
                <td className="text-text-light px-3 py-2">{row.postcode}</td>
                <td className="text-text-light px-3 py-2">{row.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-700">{t("importParseErrors")}</p>
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-amber-600">
              Row {err.row}: {err.message}
            </p>
          ))}
        </div>
      )}

      <div className="border-border-muted flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isLoading}>
          {t("importBack")}
        </Button>
        <Button size="sm" onClick={onImport} disabled={isLoading || rows.length === 0}>
          {isLoading ? t("importImporting") : t("importConfirm", { count: rows.length })}
        </Button>
      </div>
    </div>
  );
}

function ResultStep({
  result,
  onClose,
  t,
}: {
  result: ImportResult;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
          <CheckCircle size={20} className="text-green-600" />
        </div>
        <div>
          <p className="text-text-primary font-semibold">{t("importComplete")}</p>
          <p className="text-text-muted text-sm">
            {t("importInserted", { count: result.inserted })}
          </p>
        </div>
      </div>

      {result.failed.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">
            {t("importFailedRows", { count: result.failed.length })}
          </p>
          <ul className="mt-1 space-y-0.5">
            {result.failed.map((f, i) => (
              <li key={i} className="text-xs text-amber-600">
                {f.name}: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-text-muted text-sm">{t("importReviewNote")}</p>

      <div className="border-border-muted flex justify-end border-t pt-4">
        <Button size="sm" onClick={onClose}>
          {t("importDone")}
        </Button>
      </div>
    </div>
  );
}
