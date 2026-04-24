import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { CustomerInvoiceView } from "@/components/sections/invoice/CustomerInvoiceView";
import { createClient } from "@/lib/supabase/server";
import { getInvoiceBySession } from "@/services/invoice.service";

// Printable invoice page — minimal chrome so the browser's native
// print-to-PDF dialog produces a clean document. Auth-gated; 404 when the
// session id doesn't belong to the current customer.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; sessionId: string }>;
};

export default async function InvoicePage({ params }: Props) {
  const { locale, sessionId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "customerInvoice" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const invoice = await getInvoiceBySession(user.id, sessionId);
  if (!invoice) {
    return (
      <main className="flex min-h-screen items-center justify-center p-10">
        <p className="text-text-muted text-sm">{t("notFound")}</p>
      </main>
    );
  }

  return <CustomerInvoiceView invoice={invoice} />;
}
