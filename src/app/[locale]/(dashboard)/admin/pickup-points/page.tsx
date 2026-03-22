import { setRequestLocale } from "next-intl/server";

import { AdminPickupPointsSection } from "@/components/sections/admin/AdminPickupPointsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPickupPointsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPickupPointsSection />;
}
