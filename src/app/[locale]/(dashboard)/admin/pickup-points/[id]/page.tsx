import { setRequestLocale } from "next-intl/server";

import { AdminPickupPointFormSection } from "@/components/sections/admin/AdminPickupPointFormSection";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminPickupPointEditPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const pickupPointId = id === "new" ? undefined : id;

  return <AdminPickupPointFormSection pickupPointId={pickupPointId} />;
}
