import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/atoms";
import { SearchIcon, SendIcon } from "@/components/icons";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src="/images/hero/hero-bg-v2.webp"
        alt={t("imageAlt")}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/40" />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-32 text-center md:py-44 lg:py-56">
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-4xl leading-tight font-medium text-white md:text-5xl lg:text-6xl 2xl:text-9xl 2xl:leading-21">
            {t("headline")}
          </h1>
          <p className="font-display text-lg leading-snug text-white/80 md:text-xl lg:text-2xl 2xl:leading-9">
            {t("subtext")}
          </p>
          <p className="font-body mt-1 text-sm text-white/70 md:text-base">{t("speedTiers")}</p>
          <p className="font-body text-xs text-white/60 md:text-sm">{t("speedTiersNote")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/book" variant="primary" size="hero" className="min-w-52.5">
            {t("sendNow")}
            <SendIcon className="h-5 w-5" />
          </ButtonLink>

          <ButtonLink
            href="/tracking"
            size="hero"
            className="border border-white bg-transparent text-white hover:bg-white/10 active:bg-white/20"
          >
            <SearchIcon className="h-5 w-5" />
            {t("trackShipment")}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
