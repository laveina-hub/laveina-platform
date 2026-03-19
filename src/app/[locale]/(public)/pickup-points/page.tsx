import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PickupPointsSection } from "@/components/sections/pickup-points";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("pickupPoints") };
}

export default async function PickupPointsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PickupPointsSection />;
}
