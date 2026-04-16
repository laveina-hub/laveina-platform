"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { CardHeader, CardShell, Text } from "@/components/atoms";
import { TrackingTruckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ShipmentStatus } from "@/types/enums";

interface ScanLogEntry {
  new_status: string;
  scanned_at: string;
}

interface ProgressStep {
  labelKey: string;
  date?: string;
  icon: React.ReactNode;
}

interface ShipmentProgressSectionProps {
  currentStep?: number;
  scanLogs?: ScanLogEntry[];
  status?: string;
}

const ICON_SIZE = 56;

function findStatusDate(scanLogs: ScanLogEntry[], status: string): string | undefined {
  const entry = scanLogs.find((log) => log.new_status === status);
  if (!entry) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(entry.scanned_at));
}

export function ShipmentProgressSection({
  currentStep = 0,
  scanLogs = [],
  status,
}: ShipmentProgressSectionProps) {
  const t = useTranslations("tracking");

  const stepDates = {
    orderReceived:
      findStatusDate(scanLogs, ShipmentStatus.WAITING_AT_ORIGIN) ??
      findStatusDate(scanLogs, ShipmentStatus.PAYMENT_CONFIRMED),
    dispatched: findStatusDate(scanLogs, ShipmentStatus.RECEIVED_AT_ORIGIN),
    inTransit: findStatusDate(scanLogs, ShipmentStatus.IN_TRANSIT),
    arrived:
      findStatusDate(scanLogs, ShipmentStatus.ARRIVED_AT_DESTINATION) ??
      findStatusDate(scanLogs, ShipmentStatus.READY_FOR_PICKUP),
    delivered: findStatusDate(scanLogs, ShipmentStatus.DELIVERED),
  };

  const steps: ProgressStep[] = [
    {
      labelKey: "progress.orderReceived",
      date: stepDates.orderReceived,
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
      date: stepDates.dispatched,
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
    {
      labelKey: "progress.inTransit",
      date: stepDates.inTransit,
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
    {
      labelKey: "progress.outForDelivery",
      date: stepDates.arrived,
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
    {
      labelKey: "progress.delivered",
      date: stepDates.delivered,
      icon: <TrackingTruckIcon size={ICON_SIZE} />,
    },
  ];

  const activeStep = status ? computeStepFromStatus(status) : currentStep;

  return (
    <CardShell>
      <CardHeader title={t("shipmentProgress")} />

      <div className="px-6 py-8 md:px-9">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-0">
          {/* Vertical progress line (mobile) */}
          <div
            className="bg-border-default absolute left-9.5 w-2 rounded-3xl lg:hidden"
            style={{ top: 42, bottom: 42 }}
          />
          <div
            className="animate-progress-shimmer from-primary-400 via-primary-500 to-primary-600 absolute left-9.5 w-2 rounded-3xl bg-linear-to-b bg-size-[200%_100%] transition-all duration-500 lg:hidden"
            style={{
              top: 42,
              height: `calc(${(activeStep / (steps.length - 1)) * 100}% - ${(activeStep / (steps.length - 1)) * 84}px)`,
            }}
          />

          {/* Horizontal progress line (desktop) */}
          <div className="bg-border-default absolute top-9.5 right-0 left-0 hidden h-2 rounded-3xl lg:block" />
          <div
            className="animate-progress-shimmer from-primary-400 via-primary-500 to-primary-600 absolute top-9.5 left-0 hidden h-2 rounded-3xl bg-linear-to-r bg-size-[200%_100%] transition-all duration-500 lg:block"
            style={{
              width: `${(activeStep / (steps.length - 1)) * 100}%`,
            }}
          />

          {steps.map((step, index) => {
            const isActive = index <= activeStep;
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

function computeStepFromStatus(status: string): number {
  const statusStepMap: Record<string, number> = {
    [ShipmentStatus.PAYMENT_CONFIRMED]: 0,
    [ShipmentStatus.WAITING_AT_ORIGIN]: 0,
    [ShipmentStatus.RECEIVED_AT_ORIGIN]: 1,
    [ShipmentStatus.IN_TRANSIT]: 2,
    [ShipmentStatus.ARRIVED_AT_DESTINATION]: 3,
    [ShipmentStatus.READY_FOR_PICKUP]: 3,
    [ShipmentStatus.DELIVERED]: 4,
  };
  return statusStepMap[status] ?? 0;
}
