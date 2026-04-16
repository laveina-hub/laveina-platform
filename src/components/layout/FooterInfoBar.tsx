import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { NAV_LINKS, SOCIAL_LINKS } from "@/constants/nav";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcherMobile } from "./LocaleSwitcherMobile";

export async function FooterInfoBar() {
  const t = await getTranslations("footerInfoBar");

  return (
    <section
      aria-label={t("ariaLabel")}
      className={cn("border-border-default bg-bg-primary border-t")}
    >
      <div className="max-w-container mx-auto px-6 py-12 xl:px-10 xl:pt-32 xl:pb-20">
        <div className="flex flex-col justify-between gap-8 lg:flex-row">
          <div className="flex items-center justify-center gap-4 lg:justify-start">
            <Image
              src="/images/footer-info-bar/badge-gdpr.svg"
              alt={t("gdprAlt")}
              width={64}
              height={64}
              unoptimized
              className="h-24 w-auto object-contain md:h-18 xl:h-32 xl:w-32"
            />
            <Image
              src="/images/footer-info-bar/badge-soc2.svg"
              alt={t("soc2Alt")}
              width={72}
              height={72}
              unoptimized
              className="h-24 w-auto object-contain md:h-18 xl:h-32 xl:w-32"
            />
          </div>
          <div className="flex justify-center md:items-center">
            <div className="flex flex-col-reverse items-center gap-8 lg:flex-col">
              <nav
                aria-label={t("footerNav")}
                className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
              >
                {NAV_LINKS.map(({ key, href }) => (
                  <Link
                    key={key}
                    href={href}
                    className="text-text-muted hover:text-text-primary text-sm whitespace-nowrap transition-colors md:text-base"
                  >
                    {t(`nav.${key}`)}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map(({ key, icon, href }) => (
                  <a
                    key={key}
                    href={href}
                    aria-label={t(`social.${key}`)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      "border border-black transition-colors"
                    )}
                  >
                    <Image src={icon} alt="" aria-hidden="true" width={16} height={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            <p className="font-display text-text-primary text-base font-semibold">
              {t("stayUpdated")}
            </p>

            <form
              action="#"
              className="border-border-default bg-bg-primary flex w-full max-w-xs items-center overflow-hidden rounded-md border"
              aria-label={t("newsletterForm")}
            >
              <input
                type="email"
                name="email"
                placeholder={t("emailPlaceholder")}
                aria-label={t("emailLabel")}
                className={cn(
                  "text-text-primary flex-1 bg-transparent px-4 py-3 text-sm outline-none",
                  "placeholder:text-text-muted"
                )}
              />
              <button
                type="submit"
                aria-label={t("subscribeAriaLabel")}
                className={cn(
                  "flex h-full items-center px-4 py-3",
                  "text-text-muted hover:text-text-primary transition-colors"
                )}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
              </button>
            </form>

            <div className="mt-2 w-full max-w-xs">
              <LocaleSwitcherMobile />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
