import { getTranslations, setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/layout/Footer";
import { FooterInfoBar } from "@/components/layout/FooterInfoBar";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="focus:bg-primary-500 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-lg focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        {tCommon("skipToContent")}
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <FooterInfoBar />
      <Footer />
    </div>
  );
}
