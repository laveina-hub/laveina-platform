import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/enums";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Get role from profiles table (server-controlled, not user_metadata)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "customer";
  const userFullName = profile?.full_name ?? user.email ?? "User";

  return (
    <>
      <DashboardShell role={role} userFullName={userFullName}>
        {children}
      </DashboardShell>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
