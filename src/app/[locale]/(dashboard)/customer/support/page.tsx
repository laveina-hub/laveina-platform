import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CustomerSupportSection } from "@/components/sections/customer/CustomerSupportSection";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

function buildWhatsappHref(phone: string | undefined): string | null {
  if (!phone) return null;
  // Strip everything but digits — wa.me requires plain numeric prefix.
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export default async function CustomerSupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, admin_response, created_at, updated_at")
    .order("created_at", { ascending: false });

  const whatsappHref = buildWhatsappHref(env.ADMIN_WHATSAPP_PHONE ?? env.GALLABOX_PHONE);

  return <CustomerSupportSection initialTickets={tickets ?? []} whatsappHref={whatsappHref} />;
}
