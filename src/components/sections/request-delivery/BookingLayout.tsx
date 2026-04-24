"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Heading, SectionContainer } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { BookingStepper } from "@/components/molecules";
import { useBookingStore } from "@/hooks/use-booking-store";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { ExitWizardDialog } from "./ExitWizardDialog";

// Shared shell for every booking-wizard step. Concentrating the stepper +
// back button + subtitle here keeps future visual tweaks to one file.

export type BookingLayoutProps = {
  /** 1–4. Passed to the stepper to highlight the active step. */
  currentStep: 1 | 2 | 3 | 4;
  /** Where the back arrow points. Defaults to the home page. */
  backHref?: string;
  /** i18n key under `booking.*` for the back-button label. */
  backLabelKey?: string;
  /** Optional subtitle override. Defaults to `booking.step{N}Subtitle`. */
  subtitleKey?: string;
  children: React.ReactNode;
  /** Extra classes for the content wrapper (Step 2's 2-col layout wants wider). */
  contentClassName?: string;
};

// Subtitle keys per step after A2 UPDATED (pickup-point is sub-view of Step 2).
const SUBTITLE_KEY_BY_STEP = {
  1: "stepSizeSubtitle",
  2: "stepRouteSubtitle",
  3: "stepRecipientSubtitle",
  4: "stepConfirmationSubtitle",
} as const;

export function BookingLayout({
  currentStep,
  backHref = "/",
  backLabelKey = "shipmentTypeBack",
  subtitleKey,
  children,
  contentClassName,
}: BookingLayoutProps) {
  const t = useTranslations("booking");
  const router = useRouter();
  const resolvedSubtitleKey = subtitleKey ?? SUBTITLE_KEY_BY_STEP[currentStep];
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  // Q4.4 — top-of-page back arrow exits the wizard entirely. If the booking
  // has any meaningful state, confirm first so the user doesn't accidentally
  // lose their progress. Per-step back buttons keep calling setStep() and
  // preserve data via the Zustand store (no dialog needed for those).
  function handleBackClick() {
    const state = useBookingStore.getState();
    const dirty = state.parcels.length > 0 || state.currentStep > 1;
    if (dirty) {
      setExitDialogOpen(true);
    } else {
      router.push(backHref);
    }
  }

  function handleConfirmExit() {
    useBookingStore.getState().reset();
    router.push(backHref);
  }

  return (
    <div className="bg-bg-secondary min-h-screen pb-24 sm:pb-30">
      <ExitWizardDialog
        open={exitDialogOpen}
        onOpenChange={setExitDialogOpen}
        onConfirmExit={handleConfirmExit}
      />

      <SectionContainer className="pt-6 sm:pt-10">
        <button
          type="button"
          onClick={handleBackClick}
          className="text-text-primary hover:text-primary-600 inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ChevronIcon className="h-4 w-4" />
          {t(backLabelKey)}
        </button>
      </SectionContainer>

      <SectionContainer className="pt-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <BookingStepper currentStep={currentStep} />
        </div>

        {resolvedSubtitleKey && (
          <div className={cn("mx-auto mb-6 sm:mb-8", contentClassName ?? "max-w-3xl")}>
            <Heading variant="dashboard" as="h1">
              {t(resolvedSubtitleKey)}
            </Heading>
          </div>
        )}

        <div className={cn("mx-auto", contentClassName ?? "max-w-3xl")}>{children}</div>
      </SectionContainer>
    </div>
  );
}
