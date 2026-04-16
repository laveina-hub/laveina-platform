import Image from "next/image";
import Script from "next/script";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  const quickLinks = [
    { label: tNav("howItWorks"), href: "/how-it-works" },
    { label: tNav("pricing"), href: "/pricing" },
    { label: tNav("tracking"), href: "/tracking" },
    { label: tNav("pickupPoints"), href: "/pickup-points" },
  ] as const;

  const companyLinks = [
    { label: tNav("about"), href: "/about" },
    { label: tNav("contact"), href: "/contact" },
  ] as const;

  return (
    <footer className="border-border-default bg-bg-secondary overflow-hidden border-t">
      <div className="max-w-container mx-auto px-6 pt-14 pb-10 lg:px-10 lg:pt-16">
        {/* Top section: logo + link columns */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-20">
          {/* Brand column */}
          <div className="max-w-xs shrink-0">
            <Image
              src="/images/header/logo-laveina.svg"
              alt="Laveina"
              width={130}
              height={38}
              unoptimized
              className="h-8 w-auto"
            />
            <p className="text-text-muted mt-4 text-sm leading-relaxed">{t("tagline")}</p>
          </div>

          {/* Link columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="font-body text-text-primary text-sm font-semibold">
                {t("quickLinks")}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-text-muted hover:text-primary-500 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-body text-text-primary text-sm font-semibold">{t("company")}</h3>
              <ul className="mt-3 space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-text-muted hover:text-primary-500 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-body text-text-primary text-sm font-semibold">{t("legalNav")}</h3>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <a
                    href="https://www.iubenda.com/condiciones-de-uso/82074357"
                    className="iubenda-white iubenda-noiframe iubenda-embed text-text-muted hover:text-primary-500 text-sm transition-colors"
                    title={t("terms")}
                  >
                    {t("terms")}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.iubenda.com/privacy-policy/82074357"
                    className="iubenda-white iubenda-noiframe iubenda-embed text-text-muted hover:text-primary-500 text-sm transition-colors"
                    title={t("privacy")}
                  >
                    {t("privacy")}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.iubenda.com/privacy-policy/82074357/cookie-policy"
                    className="iubenda-white iubenda-noiframe iubenda-embed text-text-muted hover:text-primary-500 text-sm transition-colors"
                    title={t("cookiePolicy")}
                  >
                    {t("cookiePolicy")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border-default mt-10 border-t pt-6">
          <p className="text-text-muted text-center text-sm">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
      <div className="overflow-hidden">
        <Image
          src="/images/footer/logo-laveina-footer.svg"
          alt=""
          aria-hidden="true"
          width={1800}
          height={240}
          unoptimized
          className="h-auto w-full"
        />
      </div>
      <Script
        id="iubenda-embed"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function (w, d) {
              var loader = function () {
                var s = d.createElement("script"),
                  tag = d.getElementsByTagName("script")[0];
                s.src = "https://cdn.iubenda.com/iubenda.js";
                tag.parentNode.insertBefore(s, tag);
              };
              if (w.addEventListener) { w.addEventListener("load", loader, false); }
              else if (w.attachEvent) { w.attachEvent("onload", loader); }
              else { w.onload = loader; }
            })(window, document);
          `,
        }}
      />
    </footer>
  );
}
