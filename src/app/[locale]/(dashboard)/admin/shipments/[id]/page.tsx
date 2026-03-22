import { setRequestLocale } from "next-intl/server";

import { AdminShipmentDetailSection } from "@/components/sections/admin/AdminShipmentDetailSection";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminShipmentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminShipmentDetailSection shipmentId={id} />;
}
