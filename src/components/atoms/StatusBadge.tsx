import { cn } from "@/lib/utils";
import type { ShipmentStatus } from "@/types/enums";

const statusStyles: Record<ShipmentStatus, string> = {
  payment_confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  waiting_at_origin: "bg-amber-50 text-amber-700 ring-amber-600/20",
  received_at_origin: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  in_transit: "bg-purple-50 text-purple-700 ring-purple-600/20",
  arrived_at_destination: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  ready_for_pickup: "bg-orange-50 text-orange-700 ring-orange-600/20",
  delivered: "bg-green-50 text-green-700 ring-green-600/20",
};

export type StatusBadgeProps = {
  status: ShipmentStatus;
  label: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status] ?? "bg-gray-50 text-gray-600 ring-gray-500/10",
        className
      )}
    >
      {label}
    </span>
  );
}

// Delivery mode badge
const modeStyles = {
  internal: "bg-blue-50 text-blue-700 ring-blue-600/20",
  sendcloud: "bg-violet-50 text-violet-700 ring-violet-600/20",
} as const;

type DeliveryModeBadgeProps = {
  mode: "internal" | "sendcloud";
  className?: string;
};

export function DeliveryModeBadge({ mode, className }: DeliveryModeBadgeProps) {
  const label = mode === "internal" ? "Barcelona" : "SendCloud";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        modeStyles[mode],
        className
      )}
    >
      {label}
    </span>
  );
}
