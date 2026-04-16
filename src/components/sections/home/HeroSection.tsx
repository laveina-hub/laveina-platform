"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { ButtonLink, Heading, Text } from "@/components/atoms";
import { useAuth } from "@/hooks/use-auth";

export function HeroSection() {
  const t = useTranslations("hero");
  const { user, loading } = useAuth();

  return (
    <section className="from-primary-50 to-primary-100/60 relative overflow-hidden bg-linear-to-br via-white/80">
      <div className="max-w-container mx-auto grid w-full grid-cols-1 px-6 pt-10 md:grid-cols-2 md:pt-16 lg:px-10 xl:pt-24 2xl:pt-32">
        <div className="relative z-10 flex max-w-4xl flex-col items-start gap-6 pb-8 md:pb-50 lg:pb-60 xl:pb-80 2xl:gap-14 2xl:pb-100">
          <Heading variant="hero" as="h1">
            {t("headline")}
          </Heading>

          <Text variant="hero">{t("subtext")}</Text>

          <div className="flex flex-wrap gap-3 md:gap-4">
            {loading ? (
              <div className="bg-primary-200 h-12 w-44 animate-pulse rounded-lg md:h-14 md:w-52" />
            ) : user ? (
              <ButtonLink href="/book" variant="primary" size="hero">
                {t("bookNow")}
              </ButtonLink>
            ) : (
              <ButtonLink href="/auth/register" variant="primary" size="hero">
                {t("registerNow")}
              </ButtonLink>
            )}

            <ButtonLink href="/tracking" variant="outline" size="hero">
              {t("trackShipment")}
            </ButtonLink>
          </div>
        </div>

        <div className="relative z-10 mt-6 self-end md:mt-0">
          <Image
            src="/images/hero/hero-delivery-person.png"
            alt={t("imageAlt")}
            width={560}
            height={500}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="h-auto w-full object-contain object-bottom"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute top-1/2 left-0 w-full sm:top-1/3 md:top-auto md:bottom-12 xl:bottom-16">
        <Image
          src="/images/hero/hero-wave-decoration.svg"
          alt=""
          width={1440}
          height={120}
          aria-hidden="true"
          unoptimized
          className="w-full object-fill md:w-3/4"
        />
      </div>
    </section>
  );
}
