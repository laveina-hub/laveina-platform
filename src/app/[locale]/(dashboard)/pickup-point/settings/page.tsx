import { setRequestLocale } from "next-intl/server";

import { PickupPointSettingsSection } from "@/components/sections/pickup-point-dashboard/PickupPointSettingsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PickupPointSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PickupPointSettingsSection />;
}
