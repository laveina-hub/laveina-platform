import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CustomerRatingsSection } from "@/components/sections/customer/CustomerRatingsSection";
import { createClient } from "@/lib/supabase/server";

// Server-fetch all ratings (joined pickup-point name) for the current user.
// Ratings are not paginated for M2 — a typical customer has at most a handful
// per month, and RLS scopes the query to `customer_id = auth.uid()`.
// When growth justifies it, this becomes a paginated API.

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerRatingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data } = await supabase
    .from("ratings")
    .select(
      "id, shipment_id, stars, comment, created_at, pickup_point:pickup_points!ratings_pickup_point_id_fkey(name, city)"
    )
    .order("created_at", { ascending: false });

  type RatingRow = {
    id: string;
    shipment_id: string;
    stars: number;
    comment: string | null;
    created_at: string;
    pickup_point:
      | { name: string; city: string | null }
      | { name: string; city: string | null }[]
      | null;
  };

  const rows = ((data ?? []) as unknown as RatingRow[]).map((row) => ({
    id: row.id,
    shipment_id: row.shipment_id,
    stars: row.stars,
    comment: row.comment,
    created_at: row.created_at,
    // SAFETY: embedded select is 1-to-1 via FK; generated types model as array.
    pickup_point_name:
      (Array.isArray(row.pickup_point) ? row.pickup_point[0]?.name : row.pickup_point?.name) ?? "",
    pickup_point_city:
      (Array.isArray(row.pickup_point) ? row.pickup_point[0]?.city : row.pickup_point?.city) ??
      null,
  }));

  return <CustomerRatingsSection ratings={rows} />;
}
