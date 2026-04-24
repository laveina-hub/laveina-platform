"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const tCommon = useTranslations("common");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default shadow-overlay fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                variant === "danger" && "bg-red-50",
                variant === "warning" && "bg-amber-50",
                variant === "default" && "bg-primary-50"
              )}
            >
              <AlertTriangle
                size={20}
                className={cn(
                  variant === "danger" && "text-red-600",
                  variant === "warning" && "text-amber-600",
                  variant === "default" && "text-primary-600"
                )}
              />
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-text-primary text-base font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-text-muted mt-1 text-sm">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="focus-visible:ring-primary-500 text-text-muted hover:bg-bg-muted hover:text-text-primary rounded-md p-1 focus-visible:ring-2 focus-visible:outline-none"
                aria-label={tCommon("closeDialog")}
              >
                <CloseIcon size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                {cancelLabel ?? tCommon("cancel")}
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              className={cn(
                variant === "danger" && "bg-red-600 hover:bg-red-700 active:bg-red-800"
              )}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              {loading ? "..." : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
