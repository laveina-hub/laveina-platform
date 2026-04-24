"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";
import { useBookingStore } from "@/hooks/use-booking-store";

// Shown once per wizard mount when the persisted booking store has a
// meaningful draft (parcels picked OR user past Step 1). Two actions:
//   - Continue (primary) → just close, user keeps their saved draft
//   - Start over (outline) → close + reset() wipes the store
//
// We can't read the persisted state synchronously during SSR, so we defer
// the "should I show?" check to a useEffect after zustand has hydrated.

function hasMeaningfulDraft(state: ReturnType<typeof useBookingStore.getState>): boolean {
  return state.parcels.length > 0 || state.currentStep > 1;
}

export function ResumeDraftDialog() {
  const t = useTranslations("resumeDraft");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [decided, setDecided] = useState(false);

  const reset = useBookingStore((s) => s.reset);

  useEffect(() => {
    if (decided) return;
    // Defer one tick so persist's client-side hydration has landed.
    const id = window.setTimeout(() => {
      const state = useBookingStore.getState();
      if (hasMeaningfulDraft(state)) {
        setOpen(true);
      }
      setDecided(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [decided]);

  function handleStartOver() {
    reset();
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-default shadow-overlay fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <RotateCcw className="text-primary-600 h-5 w-5" aria-hidden />
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
            <Button type="button" variant="outline" size="sm" onClick={handleStartOver}>
              {t("startOver")}
            </Button>
            <Dialog.Close asChild>
              <Button type="button" size="sm">
                {t("continue")}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
