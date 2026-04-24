import { setRequestLocale } from "next-intl/server";

import { CustomerAddressesSection } from "@/components/sections/customer/CustomerAddressesSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerAddressesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CustomerAddressesSection />;
}
