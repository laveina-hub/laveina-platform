import { setRequestLocale } from "next-intl/server";

import { AdminShipmentsSection } from "@/components/sections/admin/AdminShipmentsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminShipmentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminShipmentsSection />;
}
