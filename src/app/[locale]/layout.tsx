import type { Metadata } from "next";
import { Prosto_One } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";

import { CrispChat } from "@/components/layout/CrispChat";
import { IubendaCookie } from "@/components/layout/IubendaCookie";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";

const prostoOne = Prosto_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-prosto-one",
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://laveina.co";

  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "Laveina",
      locale,
      type: "website",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "es" | "ca")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${prostoOne.variable} font-body antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster
                richColors
                position="top-right"
                toastOptions={{
                  className: "font-body",
                  style: {
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-elevated)",
                    border: "1px solid var(--color-border-default)",
                    fontSize: "14px",
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        <CrispChat />
        <IubendaCookie />
      </body>
    </html>
  );
}
