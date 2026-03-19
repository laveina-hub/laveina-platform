import { setRequestLocale } from "next-intl/server";

import { AdminDispatchSection } from "@/components/sections/admin/AdminDispatchSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDispatchPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminDispatchSection />;
}
