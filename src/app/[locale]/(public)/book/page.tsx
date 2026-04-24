import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { RequestDeliverySection } from "@/components/sections/request-delivery";
import {
  DEFAULT_BCN_PRICES_CENTS,
  DEFAULT_PARCEL_PRESETS,
} from "@/constants/parcel-preset-defaults";
import { createClient } from "@/lib/supabase/server";
import { getCutoffConfig } from "@/services/admin-settings.service";

// Presets + bcnPrices use local defaults while Phase 2.2b parcel-preset.service.ts
// is wired to DB — prop shape is identical. cutoffConfig drives the Step 1 speed
// panel's past-cutoff disabled state (A2 UPDATED).
// senderProfile (A4) seeds Step 3's sender section when logged in — null for
// guests means the section stays empty until the user fills it.

export type SenderProfileSeed = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  email: string;
  /** Q3.1 — user's home city; null = not yet provided. */
  city: string | null;
};

function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  const last = parts.pop() as string;
  return { first: parts.join(" "), last };
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  return { title: t("title") };
}

export default async function BookPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [cutoffConfig, senderProfile] = await Promise.all([getCutoffConfig(), loadSenderProfile()]);

  return (
    <RequestDeliverySection
      presets={DEFAULT_PARCEL_PRESETS}
      bcnPrices={DEFAULT_BCN_PRICES_CENTS}
      cutoffConfig={cutoffConfig}
      senderProfile={senderProfile}
    />
  );
}

async function loadSenderProfile(): Promise<SenderProfileSeed | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, whatsapp, email, city")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  const { first, last } = splitFullName(data.full_name ?? "");
  return {
    firstName: first,
    lastName: last,
    phone: data.phone ?? "",
    whatsapp: data.whatsapp ?? data.phone ?? "",
    email: data.email ?? "",
    city: data.city ?? null,
  };
}
