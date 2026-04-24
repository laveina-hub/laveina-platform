import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CustomerPaymentsSection } from "@/components/sections/customer/CustomerPaymentsSection";
import { createClient } from "@/lib/supabase/server";
import { listCustomerPayments } from "@/services/invoice.service";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CustomerPaymentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const payments = await listCustomerPayments(user.id);

  return <CustomerPaymentsSection payments={payments} />;
}
