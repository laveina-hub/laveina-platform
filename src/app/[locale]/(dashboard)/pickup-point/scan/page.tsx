import { getTranslations, setRequestLocale } from "next-intl/server";

import { Heading } from "@/components/atoms";

import { ScanPageClient } from "./ScanPageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("scanParcel") };
}

export default async function PickupPointScanPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <div className="space-y-6">
      <Heading variant="page" as="h1">
        {t("scanParcel")}
      </Heading>
      <ScanPageClient />
    </div>
  );
}
