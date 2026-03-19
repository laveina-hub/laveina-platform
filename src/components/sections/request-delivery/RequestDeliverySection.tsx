"use client";

import { useTranslations } from "next-intl";

import { Heading, SectionContainer } from "@/components/atoms";
import { useBookingStore } from "@/hooks/use-booking-store";
import { cn } from "@/lib/utils";

import { Step1Contact } from "./Step1Contact";
import { Step2Origin } from "./Step2Origin";
import { Step3Destination } from "./Step3Destination";
import { Step4Parcel } from "./Step4Parcel";
import { Step5Speed } from "./Step5Speed";

const STEP_KEYS = [
  "stepContact",
  "stepOrigin",
  "stepDestination",
  "stepParcel",
  "stepSpeed",
] as const;
const TOTAL_STEPS = 5;

export function RequestDeliverySection() {
  const t = useTranslations("booking");
  const currentStep = useBookingStore((s) => s.currentStep);

  return (
    <div className="bg-secondary-100 px-4 pt-14 pb-24 sm:px-6 sm:py-18 sm:pb-30 lg:px-10 lg:py-24">
      <SectionContainer>
        <Heading variant="page" as="h1" className="mb-8 sm:mb-12">
          {t("title")}
        </Heading>

        {/* Progress bar */}
        <nav
          aria-label={t("stepOf", { current: currentStep, total: TOTAL_STEPS })}
          className="mb-10"
        >
          <ol className="flex items-center gap-2 sm:gap-4">
            {STEP_KEYS.map((key, idx) => {
              const step = (idx + 1) as 1 | 2 | 3 | 4 | 5;
              const isCompleted = currentStep > step;
              const isCurrent = currentStep === step;
              return (
                <li key={key} className="flex items-center gap-2 sm:gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      aria-current={isCurrent ? "step" : undefined}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        isCompleted
                          ? "bg-primary-500 text-white"
                          : isCurrent
                            ? "bg-primary-100 text-primary-700 ring-primary-400 ring-2"
                            : "text-text-muted ring-border-default bg-white ring-1"
                      )}
                    >
                      {step}
                    </div>
                    <span
                      className={cn(
                        "hidden text-xs sm:block",
                        isCurrent ? "text-primary-700 font-medium" : "text-text-muted"
                      )}
                    >
                      {t(key)}
                    </span>
                  </div>
                  {idx < STEP_KEYS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 transition-colors",
                        isCompleted ? "bg-primary-400" : "bg-border-default"
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="mx-auto max-w-2xl">
          {currentStep === 1 && <Step1Contact />}
          {currentStep === 2 && <Step2Origin />}
          {currentStep === 3 && <Step3Destination />}
          {currentStep === 4 && <Step4Parcel />}
          {currentStep === 5 && <Step5Speed />}
        </div>
      </SectionContainer>
    </div>
  );
}
