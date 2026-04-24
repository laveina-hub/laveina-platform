"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";

// S5.4 — shown when the Stripe return URL lands on /book with a failure flag.
// Replaces the prior transient toast: a dialog gives the user a clear action
// (Retry payment / Close) and stays up until dismissed so the issue isn't
// missed on mobile.

export type PaymentFailedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user clicks Retry payment — usually re-opens Stripe Checkout. */
  onRetry?: () => void;
};

export function PaymentFailedDialog({ open, onOpenChange, onRetry }: PaymentFailedDialogProps) {
  const t = useTranslations("paymentFailed");
  const tCommon = useTranslations("common");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default shadow-overlay fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
              <AlertCircle size={20} className="text-red-600" aria-hidden />
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-text-primary text-base font-semibold">
                {t("title")}
              </Dialog.Title>
              <Dialog.Description className="text-text-muted mt-1 text-sm">
                {t("body")}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={tCommon("closeDialog")}
                className="text-text-muted hover:bg-bg-muted hover:text-text-primary focus-visible:ring-primary-500 rounded-md p-1 focus-visible:ring-2 focus-visible:outline-none"
              >
                <CloseIcon size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" size="sm">
                {t("close")}
              </Button>
            </Dialog.Close>
            {onRetry && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onRetry();
                  onOpenChange(false);
                }}
              >
                {t("retry")}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
