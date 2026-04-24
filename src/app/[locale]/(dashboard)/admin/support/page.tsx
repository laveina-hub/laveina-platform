import { setRequestLocale } from "next-intl/server";

import { AdminSupportTicketsSection } from "@/components/sections/admin/AdminSupportTicketsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminSupportTicketsSection />;
}
