"use client";

import { Check, MapPin, Package, Truck, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentType } from "react";

import { cn } from "@/lib/utils";

const STEP_KEYS = [
  "stepContact",
  "stepOrigin",
  "stepDestination",
  "stepParcel",
  "stepSpeed",
] as const;

const STEP_ICONS: ComponentType<{ className?: string }>[] = [User, MapPin, MapPin, Package, Truck];

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
      className={cn("mb-10 sm:mb-14", className)}
    >
      <ol className="flex w-full items-start">
        {STEP_KEYS.map((key, idx) => {
          const step = idx + 1;
          const isCompleted = currentStep > step;
          const isCurrent = currentStep === step;
          const Icon = STEP_ICONS[idx];

          return (
            <li
              key={key}
              className={cn(
                "relative flex flex-1 flex-col items-center",
                idx < totalSteps - 1 &&
                  "after:absolute after:top-5 after:left-[calc(50%+20px)] after:h-0.5 after:w-[calc(100%-40px)] after:content-[''] sm:after:top-6 sm:after:left-[calc(50%+24px)] sm:after:w-[calc(100%-48px)]",
                idx < totalSteps - 1 &&
                  (isCompleted ? "after:bg-primary-500" : "after:bg-border-default"),
                idx < totalSteps - 1 &&
                  isCompleted &&
                  "after:animate-progress-fill after:origin-left"
              )}
            >
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 sm:h-12 sm:w-12",
                  isCompleted && "bg-primary-500 shadow-primary-500/30 text-white shadow-md",
                  isCurrent &&
                    "bg-primary-500 animate-pulse-ring text-white shadow-[0_0_0_4px_rgba(66,165,245,0.15),0_0_20px_rgba(66,165,245,0.2)]",
                  !isCompleted &&
                    !isCurrent &&
                    "border-border-default text-text-muted border-2 bg-white"
                )}
              >
                {isCompleted ? (
                  <Check className="animate-scale-in h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                ) : (
                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", isCurrent && "animate-scale-in")} />
                )}
              </div>

              <span
                className={cn(
                  "mt-2.5 text-center text-[11px] font-medium transition-colors duration-300 sm:mt-3 sm:text-xs",
                  isCompleted && "text-primary-600",
                  isCurrent && "text-primary-700 font-semibold",
                  !isCompleted && !isCurrent && "text-text-muted"
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
