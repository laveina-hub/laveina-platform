import Image from "next/image";
import { useTranslations } from "next-intl";

import { CardHeader, CardShell, Text } from "@/components/atoms";
import { TrackingTruckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ProgressStep {
  labelKey: string;
  date?: string;
  icon: React.ReactNode;
}

interface ShipmentProgressSectionProps {
  currentStep?: number;
}

const ICON_SIZE = 56;

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
          className="size-14 object-contain"
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
    <CardShell>
      <CardHeader title={t("shipmentProgress")} />

      <div className="px-6 py-8 md:px-9">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-0">
          {/* Vertical line (mobile) */}
          <div
            className="bg-border-default absolute left-9.5 w-2 rounded-3xl lg:hidden"
            style={{ top: 42, bottom: 42 }}
          />
          <div
            className="bg-primary-500 absolute left-9.5 w-2 rounded-3xl transition-all duration-500 lg:hidden"
            style={{
              top: 42,
              height: `calc(${(currentStep / (steps.length - 1)) * 100}% - ${(currentStep / (steps.length - 1)) * 84}px)`,
            }}
          />

          {/* Horizontal line (desktop) */}
          <div className="bg-border-default absolute top-9.5 right-0 left-0 hidden h-2 rounded-3xl lg:block" />
          <div
            className="bg-primary-500 absolute top-9.5 left-0 hidden h-2 rounded-3xl transition-all duration-500 lg:block"
            style={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
            }}
          />

          {steps.map((step, index) => {
            const isActive = index <= currentStep;
            return (
              <div
                key={step.labelKey}
                className="relative z-10 flex items-center gap-4 lg:flex-1 lg:flex-col lg:items-center lg:gap-0"
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full border-2 p-3 transition-colors",
                    isActive
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-border-default bg-bg-secondary text-text-muted"
                  )}
                >
                  {step.icon}
                </div>
                <div className="lg:mt-3 lg:text-center">
                  <span className={cn("font-body text-text-muted text-xl font-medium")}>
                    {t(step.labelKey)}
                  </span>
                  {step.date && (
                    <Text variant="body" as="span" className="mt-0.5 block lg:mt-1">
                      {step.date}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
}
