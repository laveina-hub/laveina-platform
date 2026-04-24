import { getTranslations } from "next-intl/server";

import { ChevronIcon, PackageIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ShipmentPreviewRowProps = {
  trackingId: string;
  status: string;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  payment_confirmed: "bg-primary-50 text-primary-700",
  waiting_at_origin: "bg-amber-50 text-amber-700",
  received_at_origin: "bg-indigo-50 text-indigo-700",
  in_transit: "bg-purple-50 text-purple-700",
  arrived_at_destination: "bg-cyan-50 text-cyan-700",
  ready_for_pickup: "bg-orange-50 text-orange-700",
  delivered: "bg-green-50 text-green-700",
};

export async function ShipmentPreviewRow({
  trackingId,
  status,
  className,
}: ShipmentPreviewRowProps) {
  const [tStatus, tActive] = await Promise.all([
    getTranslations("shipmentStatus"),
    getTranslations("activeShipments"),
  ]);

  return (
    <div
      className={cn(
        "border-border-muted flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="bg-primary-50 text-primary-700 flex h-9 w-9 items-center justify-center rounded-lg">
          <PackageIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-body text-text-primary text-sm font-medium">{trackingId}</span>
          <span
            className={cn(
              "mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_STYLES[status] ?? "bg-bg-secondary text-text-light"
            )}
          >
            {tStatus(status)}
          </span>
        </div>
      </div>

      <Link
        href={`/tracking/${encodeURIComponent(trackingId)}`}
        className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-sm font-medium"
      >
        {tActive("view")}
        <ChevronIcon direction="right" className="h-4 w-4" />
      </Link>
    </div>
  );
}
