import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/components/atoms";
import { ReceiverOtpSection } from "@/components/sections/pickup-receiver";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyReceiverToken } from "@/services/otp.service";

// No auth — access is gated by the SHA-256-hashed token in otp_receiver_tokens.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; trackingId: string; token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "receiverOtp" });
  return { title: t("heroTitle") };
}

export default async function ReceiverOtpPage({ params }: Props) {
  const { locale, trackingId, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "receiverOtp" });

  // Admin client: anonymous public route, token gates access.
  const supabase = createAdminClient();
  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select(
      "id, tracking_id, destination_pickup_point:pickup_points!shipments_destination_pickup_point_id_fkey(name, address, city, working_hours, image_url)"
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

  const verify = await verifyReceiverToken(shipment.id, token);
  if (verify.error || !verify.data.valid) {
    return (
      <SectionContainer className="py-24 text-center">
        <p className="text-text-muted text-lg">{t("invalidLink")}</p>
      </SectionContainer>
    );
  }

  // S3.5 — plaintext now stored in `display_code` (migration 00002_sprint3),
  // written at generate time and nulled on successful verify. The receiver
  // page therefore reads the digits directly so the recipient doesn't have
  // to flip back to WhatsApp. When display_code is null (old pre-migration
  // rows or already consumed), ReceiverOtpSection falls back to the
  // "open the link from WhatsApp" hint.
  const { data: otpRow } = await supabase
    .from("otp_verifications")
    .select("expires_at, display_code")
    .eq("shipment_id", shipment.id)
    .eq("verified", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const expiresAt = otpRow?.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const plaintextCode = otpRow?.display_code ?? null;

  // SAFETY: embedded select is 1-to-1 via FK; types model it as an array.
  const dest = shipment.destination_pickup_point as unknown as {
    name: string;
    address: string;
    city: string | null;
    working_hours: unknown;
    image_url: string | null;
  } | null;

  return (
    <ReceiverOtpSection
      trackingId={shipment.tracking_id}
      shipmentId={shipment.id}
      token={token}
      code={plaintextCode}
      expiresAt={expiresAt}
      destination={{
        name: dest?.name ?? "",
        address: dest?.address ?? "",
        city: dest?.city ?? null,
        workingHours: null,
        imageUrl: dest?.image_url ?? null,
      }}
    />
  );
}
