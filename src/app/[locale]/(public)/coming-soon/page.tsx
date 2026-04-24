import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/atoms";
import { Link } from "@/i18n/navigation";

// Fallback target for footer / nav entries that don't have a dedicated page
// yet. Single route keeps the nav consistent without scattering stub pages.

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "comingSoon" });
  return { title: t("title") };
}

export default async function ComingSoonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "comingSoon" });

  return (
    <main className="bg-bg-secondary flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/images/header/logo-laveina.svg"
            alt="Laveina"
            width={120}
            height={35}
            unoptimized
            className="h-9 w-auto"
          />
        </div>
        <h1 className="font-display text-text-primary text-3xl leading-tight font-bold sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-text-muted mt-4 text-base leading-relaxed">{t("subtitle")}</p>
        <div className="mt-8 flex justify-center">
          <Link href="/">
            <Button size="md">{t("backHome")}</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
