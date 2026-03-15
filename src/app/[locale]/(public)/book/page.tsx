import { setRequestLocale } from "next-intl/server";

import { RequestDeliverySection } from "@/components/sections/RequestDeliverySection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BookPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RequestDeliverySection />;
}
