import { setRequestLocale } from "next-intl/server";

import { AdminSettingsSection } from "@/components/sections/admin/AdminSettingsSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminSettingsSection />;
}
