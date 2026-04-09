import { setRequestLocale } from "next-intl/server";

import { AdminUsersSection } from "@/components/sections/admin/AdminUsersSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminUsersSection />;
}
