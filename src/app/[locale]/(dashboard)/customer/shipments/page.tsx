import { setRequestLocale } from "next-intl/server";

import { CustomerShipmentsSection } from "@/components/sections/customer/CustomerShipmentsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerShipmentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CustomerShipmentsSection />;
}
