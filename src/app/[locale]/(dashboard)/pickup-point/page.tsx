import { setRequestLocale } from "next-intl/server";

import { PickupPointDashboardSection } from "@/components/sections/pickup-point-dashboard/PickupPointDashboardSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PickupPointDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PickupPointDashboardSection />;
}
