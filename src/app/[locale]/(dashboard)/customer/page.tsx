import { setRequestLocale } from "next-intl/server";

import { CustomerOverviewSection } from "@/components/sections/customer/CustomerOverviewSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CustomerOverviewSection />;
}
