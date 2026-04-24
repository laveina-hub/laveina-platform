import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CustomerProfileSection } from "@/components/sections/customer/CustomerProfileSection";
import { createClient } from "@/lib/supabase/server";

// Server-fetch the profile so the client form has the current values on first
// paint — avoids a flash of empty inputs on slower connections. The client
// component handles edits + password changes.

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, whatsapp, email, preferred_locale, city")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.length <= 1 ? (parts[0] ?? "") : parts.slice(0, -1).join(" ");
  const lastName = parts.length <= 1 ? "" : parts[parts.length - 1];
  // Fall back to the URL locale when the column is empty (pre-migration
  // accounts) so the picker has a sensible initial value.
  const preferredLocale = (profile?.preferred_locale ?? locale) as "es" | "ca" | "en";

  return (
    <CustomerProfileSection
      initial={{
        firstName,
        lastName,
        phone: profile?.phone ?? "",
        whatsapp: profile?.whatsapp ?? "",
        email: profile?.email ?? user.email ?? "",
        preferredLocale,
        city: profile?.city ?? "",
      }}
    />
  );
}
