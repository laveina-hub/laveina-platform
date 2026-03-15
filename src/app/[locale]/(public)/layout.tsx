import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/layout/footer";
import { FooterInfoBar } from "@/components/layout/footer-info-bar";
import { Header } from "@/components/layout/header";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <FooterInfoBar />
      <Footer />
    </div>
  );
}
