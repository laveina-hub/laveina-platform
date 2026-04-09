import { setRequestLocale } from "next-intl/server";

import { AdminUserDetailSection } from "@/components/sections/admin/AdminUserDetailSection";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <AdminUserDetailSection userId={id} />;
}
