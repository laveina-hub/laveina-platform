import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/components/atoms";
import { ChevronIcon } from "@/components/icons";
import { ShipmentPreviewRow, TrackingLookupInput } from "@/components/molecules";
import { Link } from "@/i18n/navigation";

export type ActiveShipmentsCardProps = {
  /** Undefined/empty renders the logged-out variant (tracker-only). */
  shipments?: Array<{ id: string; tracking_id: string; status: string }>;
  previewLimit?: number;
};

export async function ActiveShipmentsCard({
  shipments,
  previewLimit = 3,
}: ActiveShipmentsCardProps) {
  const t = await getTranslations("activeShipments");

  const previewRows = (shipments ?? []).slice(0, previewLimit);
  const hasMore = (shipments?.length ?? 0) > previewLimit;

  return (
    <SectionContainer className="py-10 md:py-14">
      <div className="from-primary-50/60 border-border-muted mx-auto w-full max-w-2xl rounded-2xl border bg-linear-to-b to-white p-5 shadow-sm md:p-6">
        <h2 className="font-heading text-text-primary text-base font-semibold md:text-lg">
          {t("title")}
        </h2>

        <div className="mt-4">
          <TrackingLookupInput />
        </div>

        {previewRows.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2" aria-label={t("title")}>
            {previewRows.map((s) => (
              <li key={s.id}>
                <ShipmentPreviewRow trackingId={s.tracking_id} status={s.status} />
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="mt-4">
            <Link
              href="/customer/shipments"
              className="border-border-muted text-text-primary hover:bg-bg-secondary flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium"
            >
              {t("viewAll")}
              <ChevronIcon direction="right" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </SectionContainer>
  );
}
