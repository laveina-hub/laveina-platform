import { createHash } from "node:crypto";

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/components/atoms";
import { DeliveryConfirmationSection } from "@/components/sections/delivery-confirm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Token validated against delivery_confirmation_tokens (SHA-256, 7 days).
// Issued by tracking.service.markDelivered; reusable within the 7-day window
// (aligned with the ratings edit window so the receiver can return to tweak
// their review). Rating re-submission is gated by the ratings UNIQUE
// constraint, not here.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; trackingId: string; token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "deliveryConfirm" });
  return { title: t("title") };
}

export default async function DeliveryConfirmPage({ params }: Props) {
  const { locale, trackingId, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "deliveryConfirm" });

  const supabase = createAdminClient();

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select(
      "id, tracking_id, status, customer_id, updated_at, receiver_email, origin_pickup_point:pickup_points!shipments_origin_pickup_point_id_fkey(name), destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name)"
    )
    .eq("tracking_id", trackingId)
    .maybeSingle();

  if (shipmentError || !shipment) {
    return (
      <SectionContainer className="py-24 text-center">
        <p className="text-text-muted text-lg">{t("invalidLink")}</p>
      </SectionContainer>
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: tokenRow } = await supabase
    .from("delivery_confirmation_tokens")
    .select("id, expires_at")
    .eq("shipment_id", shipment.id)
    .eq("token_hash", tokenHash)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!tokenRow) {
    return (
      <SectionContainer className="py-24 text-center">
        <p className="text-text-muted text-lg">{t("invalidLink")}</p>
      </SectionContainer>
    );
  }

  // A11 — fetch existing rating with full snapshot so the UI can render the
  // already-submitted stars/comment and offer an Edit button within the
  // 7-day window.
  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id, stars, comment, created_at")
    .eq("shipment_id", shipment.id)
    .eq("customer_id", shipment.customer_id)
    .maybeSingle();

  // Hide the form for non-owners so the UI doesn't invite a RLS 403.
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  const isOwner = !!user && user.id === shipment.customer_id;

  // SAFETY: embedded select is 1-to-1; generated types model it as an array.
  const origin = shipment.origin_pickup_point as unknown as { name: string } | null;
  const destination = shipment.destination_pickup_point as unknown as { name: string } | null;

  return (
    <DeliveryConfirmationSection
      trackingId={shipment.tracking_id}
      shipmentId={shipment.id}
      originName={origin?.name ?? ""}
      destinationName={destination?.name ?? ""}
      deliveredAt={shipment.updated_at}
      canRate={isOwner && !existingRating && shipment.status === "delivered"}
      existingRating={existingRating ?? null}
      isAuthenticated={!!user}
      receiverEmail={shipment.receiver_email}
    />
  );
}
