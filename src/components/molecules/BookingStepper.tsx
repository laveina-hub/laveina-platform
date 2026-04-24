"use client";

import { useTranslations } from "next-intl";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// Visual spec (M2 design, Figma node 36756:16445):
//   - Compact circle (~32px) with 2px border, no pulse/glow.
//   - Current: primary border + primary number, pending: neutral border + muted number.
//   - Completed swaps number for a check mark and fills the connector to the next step.
// 4 steps per A2 UPDATED (2026-04-21): pickup-point picker is a sub-view of
// Step 2, not a standalone step. Origin/destination selection happens inline
// on desktop; mobile opens a full-screen picker sheet (see S2.2.3).
const STEP_KEYS = ["stepSize", "stepRoute", "stepRecipient", "stepConfirmation"] as const;

interface BookingStepperProps {
  currentStep: number;
  className?: string;
}

function BookingStepper({ currentStep, className }: BookingStepperProps) {
  const t = useTranslations("booking");
  const totalSteps = STEP_KEYS.length;

  return (
    <nav
      aria-label={t("stepOf", { current: currentStep, total: totalSteps })}
      className={cn("mb-8 sm:mb-12", className)}
    >
      {/* Q4.3 — desktop shows "Step X of N" text above the dots; mobile relies
          on the dots alone to save space. */}
      <p className="text-text-muted mb-3 hidden text-sm font-medium sm:block">
        {t("stepOf", { current: currentStep, total: totalSteps })}
      </p>
      <ol className="flex w-full items-start">
        {STEP_KEYS.map((key, idx) => {
          const step = idx + 1;
          const isCompleted = currentStep > step;
          const isCurrent = currentStep === step;
          const stepNumber = String(step).padStart(2, "0");

          return (
            <li
              key={key}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-2",
                idx < totalSteps - 1 &&
                  "after:absolute after:top-4 after:left-[calc(50%+18px)] after:h-0.5 after:w-[calc(100%-36px)] after:content-[''] sm:after:top-5 sm:after:left-[calc(50%+22px)] sm:after:w-[calc(100%-44px)]",
                idx < totalSteps - 1 &&
                  (isCompleted ? "after:bg-primary-500" : "after:bg-border-default")
              )}
            >
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-sm font-medium transition-colors sm:h-10 sm:w-10 sm:text-base",
                  isCompleted && "border-primary-500 bg-primary-500 text-white",
                  isCurrent && "border-primary-500 text-primary-600",
                  !isCompleted && !isCurrent && "border-border-default text-text-muted"
                )}
              >
                {isCompleted ? (
                  <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>

              {/* Show labels only for the current step at <sm, then every step
                  from sm+. At 375px, long labels like "Origin & destination"
                  would wrap awkwardly under each circle; the current-step
                  label below is enough context for progress. */}
              <span
                className={cn(
                  "text-center text-xs font-medium transition-colors sm:text-sm",
                  isCompleted && "text-primary-600 hidden sm:inline",
                  isCurrent && "text-primary-600",
                  !isCompleted && !isCurrent && "text-text-muted hidden sm:inline"
                )}
              >
                {t(key)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { BookingStepper, type BookingStepperProps };
