import { setRequestLocale } from "next-intl/server";

import { CustomerShipmentDetailSection } from "@/components/sections/customer/CustomerShipmentDetailSection";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function CustomerShipmentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <CustomerShipmentDetailSection shipmentId={id} />;
}
