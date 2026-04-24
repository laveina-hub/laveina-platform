import { getTranslations } from "next-intl/server";

import { Button } from "@/components/atoms";
import { PlusIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";

// Q14.4 — Server Component (no client JS needed). Renders a sticky bottom
// bar on small viewports only; desktop already exposes the same CTA in the
// Topbar so we hide this above `lg`. Uses a fixed safe-area-aware bottom
// inset so it sits above iOS home-indicator gestures.

export async function CustomerStickyCta() {
  const t = await getTranslations("customerDashboard");
  return (
    <div
      className="border-border-default fixed inset-x-0 bottom-0 z-30 border-t bg-white px-4 py-3 shadow-lg lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <Link href="/book" className="block">
        <Button size="md" className="w-full justify-center gap-2">
          <PlusIcon size={16} />
          {t("bookShipment")}
        </Button>
      </Link>
    </div>
  );
}
