import { CheckCircle2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Button, CardBody, CardShell, StatusBadge } from "@/components/atoms";
import { BoxIcon, ChevronIcon, ClockIcon, PackageIcon, PlusIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { formatCents, formatDateMedium, type Locale } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ShipmentStatus } from "@/types/enums";

// Server Component: stats + last 3 shipments, derived from the customer's
// own shipments via RLS (`shipments_select_own`). No client JS needed beyond
// the <Link> navs — kept light per Engineering Standards §2.
//
// A note on the "Cancelled" card: the shipment_status enum has no cancelled
// state in M2 (cancellation flow is a future sprint), so the count is
// always 0 today. The tile is kept in the 2×2 grid for layout parity with
// the client spec; when cancellation lands, swap `cancelled` to a real
// filter on `shipments.status === "cancelled"`.

const ACTIVE_STATUSES: ShipmentStatus[] = [
  "payment_confirmed",
  "waiting_at_origin",
  "received_at_origin",
  "in_transit",
  "arrived_at_destination",
  "ready_for_pickup",
];

type ShipmentRow = {
  id: string;
  tracking_id: string;
  status: ShipmentStatus;
  price_cents: number;
  created_at: string;
  destination_postcode: string;
};

export async function CustomerOverviewSection() {
  const t = await getTranslations("customerDashboard");
  const tStatus = await getTranslations("shipmentStatus");
  // Q18.2 — explicit locale so all date renders match the customer's chosen
  // language regardless of whether the request was prerendered or streamed.
  const locale = (await getLocale()) as Locale;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout auth guards already prevent an unauthenticated render — this is
  // defence in depth so a stray direct import can't explode.
  if (!user) {
    return null;
  }

  // Fetch recent shipments; cap at 100 so the aggregation stays O(1)-ish for
  // the rare high-volume customer. Counts beyond 100 still drive a plausible
  // "Total" via range/count when we pair with a separate HEAD query — but for
  // the overview a capped window is fine.
  const { data, count } = await supabase
    .from("shipments")
    .select("id, tracking_id, status, price_cents, created_at, destination_postcode", {
      count: "exact",
    })
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const shipments = (data ?? []) as ShipmentRow[];
  const total = count ?? shipments.length;
  const inProgress = shipments.filter((s) => ACTIVE_STATUSES.includes(s.status)).length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;
  // Always 0 in M2 — see file-header note. Kept as a const so the future
  // cancellation flow only has to swap one expression.
  const cancelled = 0;
  const recentShipments = shipments.slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-body text-text-primary text-2xl font-semibold">
            {t("overviewTitle")}
          </h1>
          <p className="text-text-muted mt-1 text-sm">{t("overviewSubtitle")}</p>
        </div>
        <Link href="/book">
          <Button size="sm" className="gap-2">
            <PlusIcon size={16} />
            {t("bookShipment")}
          </Button>
        </Link>
      </header>

      <section
        aria-label={t("overviewStatsAria")}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <StatCard
          icon={<PackageIcon className="text-primary-600" size={22} />}
          label={t("statTotal")}
          value={String(total)}
        />
        <StatCard
          icon={<ClockIcon className="text-amber-600" size={22} />}
          label={t("statInProgress")}
          value={String(inProgress)}
        />
        <StatCard
          icon={<CheckCircle2 className="text-emerald-600" size={22} />}
          label={t("statDelivered")}
          value={String(delivered)}
        />
        <StatCard
          icon={<BoxIcon className="text-text-muted" size={22} />}
          label={t("statCancelled")}
          value={String(cancelled)}
          muted
        />
      </section>

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="text-text-primary text-base font-semibold">
            {t("recentShipmentsTitle")}
          </h2>
          {total > recentShipments.length && (
            <Link
              href="/customer/shipments"
              className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-sm font-medium"
            >
              {t("viewAllShipments")}
              <ChevronIcon direction="right" size={14} />
            </Link>
          )}
        </div>

        {recentShipments.length === 0 ? (
          <CardShell>
            <CardBody className="flex flex-col items-center gap-3 text-center">
              <PackageIcon className="text-text-muted" size={28} />
              <div>
                <p className="text-text-primary font-medium">{t("emptyTitle")}</p>
                <p className="text-text-muted text-sm">{t("emptySubtitle")}</p>
              </div>
              <Link href="/book">
                <Button size="sm">{t("bookShipment")}</Button>
              </Link>
            </CardBody>
          </CardShell>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentShipments.map((shipment) => (
              <li key={shipment.id}>
                <Link
                  href={`/customer/shipments/${shipment.id}`}
                  className="group focus-visible:outline-primary-500 block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <CardShell className="group-hover:border-primary-300 transition-colors">
                    <CardBody className="flex flex-wrap items-center justify-between gap-3 px-5! py-4!">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-primary-50 text-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <PackageIcon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-primary-600 text-sm font-semibold">
                            {shipment.tracking_id}
                          </p>
                          <p className="text-text-muted truncate text-xs">
                            {t("recentRow", {
                              destination: shipment.destination_postcode,
                              date: formatDateMedium(shipment.created_at, locale),
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-text-primary text-sm tabular-nums">
                          {formatCents(shipment.price_cents)}
                        </span>
                        <StatusBadge status={shipment.status} label={tStatus(shipment.status)} />
                      </div>
                    </CardBody>
                  </CardShell>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
};

function StatCard({ icon, label, value, muted }: StatCardProps) {
  return (
    <CardShell>
      <CardBody className="space-y-2! px-5! py-5!">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              muted ? "bg-bg-muted" : "bg-primary-50"
            }`}
          >
            {icon}
          </span>
          <span className="text-text-muted text-sm">{label}</span>
        </div>
        <p className="text-text-primary text-2xl font-semibold tabular-nums">{value}</p>
      </CardBody>
    </CardShell>
  );
}
