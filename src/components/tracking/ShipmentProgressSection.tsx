import Image from "next/image";
import { useTranslations } from "next-intl";

import { Heading, Text } from "@/components/atoms";
import { TrackingTruckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ProgressStep {
  labelKey: string;
  date?: string;
  icon: React.ReactNode;
}

interface ShipmentProgressSectionProps {
  /** Zero-based index of the current active step (0–4). Steps up to and including this index are completed/active. */
  currentStep?: number;
}

const ICON_SIZE = 24;

export function ShipmentProgressSection({ currentStep = 2 }: ShipmentProgressSectionProps) {
  const t = useTranslations("tracking");

  const steps: ProgressStep[] = [
    {
      labelKey: "progress.orderReceived",
      date: "Feb 28, 2026",
      icon: (
        <Image
          src="/images/request-delivery/box-package.svg"
          alt=""
          width={ICON_SIZE}
          height={ICON_SIZE}
          className="h-6 w-6 object-contain"
        />
      ),
    },
    {
      labelKey: "progress.dispatched",
      date: "Feb 29, 2026",
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
    {
      labelKey: "progress.inTransit",
      date: "Mar 2, 2026",
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
    {
      labelKey: "progress.outForDelivery",
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
    {
      labelKey: "progress.delivered",
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
  ];

  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="border-border-muted border-b px-6 py-5 md:px-8">
        <Heading variant="card">{t("shipmentProgress")}</Heading>
      </div>

      {/* Desktop / Tablet: Horizontal stepper */}
      <div className="hidden px-6 py-8 sm:block md:px-8">
        <div className="relative flex items-start justify-between">
          {/* Connecting line behind circles */}
          <div className="bg-border-default absolute top-6 right-10 left-10 h-0.5" />
          <div
            className="bg-primary-500 absolute top-6 left-10 h-0.5 transition-all duration-500"
            style={{
              width: `calc(${(currentStep / (steps.length - 1)) * 100}% - 80px)`,
            }}
          />

          {steps.map((step, index) => {
            const isActive = index <= currentStep;
            return (
              <div
                key={step.labelKey}
                className="relative z-10 flex flex-col items-center"
                style={{ width: `${100 / steps.length}%` }}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors",
                    isActive
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-border-default bg-bg-secondary text-text-muted"
                  )}
                >
                  {step.icon}
                </div>
                <span
                  className={cn(
                    "font-body mt-3 text-center text-xs font-medium",
                    isActive ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {t(step.labelKey)}
                </span>
                {step.date && (
                  <Text variant="caption" as="span" className="mt-1">
                    {step.date}
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical timeline */}
      <div className="px-6 py-6 sm:hidden">
        <div className="relative flex flex-col gap-8">
          {steps.map((step, index) => {
            const isActive = index <= currentStep;
            const isLast = index === steps.length - 1;
            return (
              <div key={step.labelKey} className="relative flex items-start gap-4">
                {/* Vertical line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute top-12 left-6 w-0.5 -translate-x-1/2",
                      index < currentStep ? "bg-primary-500" : "bg-border-default"
                    )}
                    style={{ height: "calc(100% + 2rem)" }}
                  />
                )}
                {/* Circle icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isActive
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-border-default bg-bg-secondary text-text-muted"
                  )}
                >
                  {step.icon}
                </div>
                {/* Text */}
                <div className="pt-1">
                  <span
                    className={cn(
                      "font-body text-sm font-medium",
                      isActive ? "text-text-primary" : "text-text-muted"
                    )}
                  >
                    {t(step.labelKey)}
                  </span>
                  {step.date && (
                    <Text variant="caption" className="mt-0.5">
                      {step.date}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
