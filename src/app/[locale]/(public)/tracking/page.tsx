import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { TrackingSearchSection } from "@/components/sections/tracking";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tracking" });
  return { title: t("title") };
}

export default async function TrackingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tracking" });

  return (
    <div className="bg-primary-50">
      <div className="max-w-container mx-auto px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <h1 className="text-primary mb-16 text-4xl font-medium md:text-8xl">{t("title")}</h1>

        <TrackingSearchSection />
      </div>
    </div>
  );
}
