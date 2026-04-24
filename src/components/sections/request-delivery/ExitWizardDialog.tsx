"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";

// S5.4 — confirm dialog shown when the user tries to leave the wizard with a
// meaningful in-progress booking. Full router-change interception isn't
// offered by the App Router yet, so callers wire this to explicit exit
// actions (hamburger "Home", "Cancel booking" button, etc.) and to the
// `beforeunload` listener for tab-close protection.

export type ExitWizardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires when the user confirms they want to leave (discard draft). */
  onConfirmExit: () => void;
  /** Optional — called when the user chooses "Keep editing" (close dialog). */
  onKeep?: () => void;
};

export function ExitWizardDialog({
  open,
  onOpenChange,
  onConfirmExit,
  onKeep,
}: ExitWizardDialogProps) {
  const t = useTranslations("exitWizard");
  const tCommon = useTranslations("common");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default shadow-overlay fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <LogOut size={20} className="text-amber-600" aria-hidden />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onKeep?.();
                onOpenChange(false);
              }}
            >
              {t("keepEditing")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-red-600 hover:bg-red-700 active:bg-red-800"
              onClick={() => {
                onConfirmExit();
                onOpenChange(false);
              }}
            >
              {t("exit")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
