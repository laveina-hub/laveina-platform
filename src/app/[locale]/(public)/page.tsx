import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ActiveShipmentsCard } from "@/components/sections/home/ActiveShipmentsCard";
import { HeroSection } from "@/components/sections/home/HeroSection";
import { createClient } from "@/lib/supabase/server";

// Per-user shipment preview means no shared cache.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

// Delivered shipments live in the dashboard, not the home preview.
const ACTIVE_STATUSES = [
  "payment_confirmed",
  "waiting_at_origin",
  "received_at_origin",
  "in_transit",
  "arrived_at_destination",
  "ready_for_pickup",
] as const;

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <HeroSection />
        <ActiveShipmentsCard />
      </>
    );
  }

  const activeShipments = await supabase
    .from("shipments")
    .select("id, tracking_id, status")
    .eq("customer_id", user.id)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    // Card shows 3 rows; 4th row only tells us whether to render "View all".
    .limit(4)
    .then(({ data }) => data ?? []);

  return (
    <>
      <HeroSection />
      <ActiveShipmentsCard shipments={activeShipments} />
    </>
  );
}
