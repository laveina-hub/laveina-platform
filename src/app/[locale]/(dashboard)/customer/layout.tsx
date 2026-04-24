import { setRequestLocale } from "next-intl/server";

import { CustomerStickyCta } from "@/components/sections/customer/CustomerStickyCta";

// Q14.4 — wraps every customer dashboard page so the "Book a shipment"
// affordance is always one tap away on small viewports. The CTA only paints
// on mobile (lg:hidden); desktop already has the Topbar button.

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function CustomerLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <div className="pb-20 lg:pb-0">{children}</div>
      <CustomerStickyCta />
    </>
  );
}
