import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CustomerNotificationsSection } from "@/components/sections/customer/CustomerNotificationsSection";
import { resolveNotificationPrefs } from "@/constants/notification-prefs";
import { createClient } from "@/lib/supabase/server";
import type { ShipmentStatus } from "@/types/enums";

// Feed is derived from scan_logs joined to the user's shipments — a dedicated
// events table would be overkill for M2. RLS on scan_logs already limits a
// customer to their own shipments' logs.

const MAX_FEED_EVENTS = 20;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerNotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const [prefsResult, feedResult] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("prefs")
      .eq("customer_id", user.id)
      .maybeSingle(),
    // scan_logs → shipment for the current user, newest first.
    supabase
      .from("scan_logs")
      .select(
        "id, scanned_at, new_status, shipment:shipments!scan_logs_shipment_id_fkey(id, tracking_id, customer_id)"
      )
      .order("scanned_at", { ascending: false })
      .limit(MAX_FEED_EVENTS * 3), // fetch extra; filter by current user below
  ]);

  const prefs = resolveNotificationPrefs(prefsResult.data?.prefs);

  type RawFeedRow = {
    id: string;
    scanned_at: string;
    new_status: ShipmentStatus;
    shipment:
      | { id: string; tracking_id: string; customer_id: string }
      | { id: string; tracking_id: string; customer_id: string }[]
      | null;
  };

  const feed = ((feedResult.data ?? []) as unknown as RawFeedRow[])
    .map((row) => {
      // SAFETY: embedded select is 1-to-1 via FK; generated types model as array.
      const shipment = Array.isArray(row.shipment) ? row.shipment[0] : row.shipment;
      return shipment ? { ...row, shipment } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => row.shipment.customer_id === user.id)
    .slice(0, MAX_FEED_EVENTS)
    .map((row) => ({
      id: row.id,
      scanned_at: row.scanned_at,
      new_status: row.new_status,
      tracking_id: row.shipment.tracking_id,
      shipment_id: row.shipment.id,
    }));

  return <CustomerNotificationsSection initialPrefs={prefs} feed={feed} />;
}
