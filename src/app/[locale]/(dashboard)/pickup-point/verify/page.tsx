import { getTranslations, setRequestLocale } from "next-intl/server";

import { Heading } from "@/components/atoms";

import { VerifyPageClient } from "./VerifyPageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("verifyRecipient") };
}

export default async function PickupPointVerifyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <div className="space-y-6">
      <Heading variant="page" as="h1">
        {t("verifyRecipient")}
      </Heading>
      <VerifyPageClient />
    </div>
  );
}
