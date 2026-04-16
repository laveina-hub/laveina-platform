import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BookingSuccessSection } from "@/components/sections/book-success";

export const revalidate = 86400;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("bookingSuccess") };
}

export default async function BookingSuccessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BookingSuccessSection />;
}
