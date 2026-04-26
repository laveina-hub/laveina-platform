"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { SenderProfileSeed } from "@/app/[locale]/(public)/book/page";
import { GoogleMapsWrapper } from "@/components/molecules/GoogleMapsWrapper";
import { type CutoffConfig } from "@/constants/cutoff-times";
import { type ParcelPreset, type ParcelPresetSlug } from "@/constants/parcel-sizes";
import { useBookingStore } from "@/hooks/use-booking-store";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

import { BookingLayout } from "./BookingLayout";
import { PaymentFailedDialog } from "./PaymentFailedDialog";
import { ResumeDraftDialog } from "./ResumeDraftDialog";
import { Step1Size } from "./Step1Size";
import { Step2Route } from "./Step2Route";
import { Step3Recipient } from "./Step3Recipient";
import { Step4Confirm } from "./Step4Confirm";

// 4-step wizard per client Final A2 (2026-04-23):
//   Step 1 Size (presets + optional custom dimensions)
//   Step 2 Origin & Destination
//   Step 3 Recipient (+ sender auto-fill + Edit per A4)
//   Step 4 Review & Payment (speed picked here, route-aware)
// Step3PickupPoint.tsx still exists but is out of the flow; S2.2.3 will
// refactor it into a modal sub-view of Step 2.
//
// Sprint 5 chunk 2 additions:
//  - ResumeDraftDialog: offers resume / start-over on return with saved draft
//  - ?payment_cancelled=true toast: shown when user aborts the Stripe session

type BcnPricesCents = Record<
  ParcelPresetSlug,
  { standard: number; express: number; next_day: number }
>;

type Props = {
  presets: ParcelPreset[];
  bcnPrices: BcnPricesCents;
  cutoffConfig: CutoffConfig;
  /** A4 — sender seed from the user's profile; null for guests. */
  senderProfile: SenderProfileSeed | null;
};

export function RequestDeliverySection({ presets, bcnPrices, cutoffConfig, senderProfile }: Props) {
  const currentStep = useBookingStore((s) => s.currentStep);
  const setStep = useBookingStore((s) => s.setStep);
  const searchParams = useSearchParams();
  const [paymentFailedOpen, setPaymentFailedOpen] = useState(false);

  // Wizard step is in-place state (no route change), so reset window scroll
  // when the user moves between steps. Smooth feels right for a guided flow.
  useScrollToTop(currentStep, { behavior: "smooth" });

  // S5.4 PaymentFailedDialog — open once when the Stripe cancel URL lands.
  // Strip the query param so a refresh doesn't re-open the dialog.
  useEffect(() => {
    if (searchParams.get("payment_cancelled") === "true") {
      setPaymentFailedOpen(true);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_cancelled");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GoogleMapsWrapper>
      <ResumeDraftDialog />
      <PaymentFailedDialog
        open={paymentFailedOpen}
        onOpenChange={setPaymentFailedOpen}
        onRetry={() => setStep(4)}
      />
      <BookingLayout
        currentStep={currentStep}
        contentClassName={currentStep === 1 || currentStep === 2 ? "max-w-5xl" : undefined}
      >
        {currentStep === 1 && <Step1Size presets={presets} bcnPrices={bcnPrices} />}
        {currentStep === 2 && <Step2Route cutoffConfig={cutoffConfig} />}
        {currentStep === 3 && (
          <Step3Recipient presets={presets} bcnPrices={bcnPrices} senderProfile={senderProfile} />
        )}
        {currentStep === 4 && (
          <Step4Confirm presets={presets} bcnPrices={bcnPrices} cutoffConfig={cutoffConfig} />
        )}
      </BookingLayout>
    </GoogleMapsWrapper>
  );
}
