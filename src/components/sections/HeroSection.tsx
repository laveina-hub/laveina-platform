import Image from "next/image";
import { useTranslations } from "next-intl";

import { ButtonLink, Heading, Text } from "@/components/atoms";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="bg-primary-50 relative overflow-hidden">
      <div className="mx-auto grid w-full grid-cols-1 px-6 pt-7 md:grid-cols-2 md:pt-16 xl:pl-32 2xl:pt-32">
        <div className="relative z-10 flex max-w-4xl flex-col items-start gap-6 pb-0 md:pb-[200px] lg:pb-[240px] xl:pb-[320px] 2xl:gap-14 2xl:pb-[400px]">
          <Heading variant="hero" as="h1">
            {t("headline")}
          </Heading>

          <Text variant="hero">{t("subtext")}</Text>

          <div className="flex flex-wrap gap-2 md:gap-3">
            <ButtonLink href="/auth/register" variant="primary" size="hero">
              {t("registerNow")}
            </ButtonLink>

            <ButtonLink href="/tracking" variant="outline" size="hero">
              {t("trackShipment")}
            </ButtonLink>
          </div>
        </div>

        <div className="relative z-10 mt-6 self-end md:mt-0">
          <Image
            src="/images/hero/hero-delivery-person.png"
            alt="Delivery courier on a scooter"
            width={560}
            height={500}
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
          className="w-full object-fill md:w-3/4"
        />
      </div>
    </section>
  );
}
