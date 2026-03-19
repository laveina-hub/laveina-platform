import { setRequestLocale } from "next-intl/server";

import { AdminOverviewSection } from "@/components/sections/admin/AdminOverviewSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminOverviewSection />;
}
