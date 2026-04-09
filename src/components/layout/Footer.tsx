import Image from "next/image";
import Script from "next/script";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className={cn("border-border-default bg-bg-primary overflow-hidden border-t")}>
      <div className="max-w-container mx-auto space-y-10 px-6 py-10 lg:px-10">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <p className="text-text-muted text-sm md:text-lg">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>

          <nav
            aria-label={t("legalNav")}
            className="text-text-muted flex items-center gap-3 text-sm md:text-lg"
          >
            <a
              href="https://www.iubenda.com/condiciones-de-uso/82074357"
              className="iubenda-white iubenda-noiframe iubenda-embed hover:text-text-primary transition-colors"
              title={t("terms")}
            >
              {t("terms")}
            </a>
            <span aria-hidden="true" className="text-border-default select-none">
              |
            </span>
            <a
              href="https://www.iubenda.com/privacy-policy/82074357"
              className="iubenda-white iubenda-noiframe iubenda-embed hover:text-text-primary transition-colors"
              title={t("privacy")}
            >
              {t("privacy")}
            </a>
            <span aria-hidden="true" className="text-border-default select-none">
              |
            </span>
            <a
              href="https://www.iubenda.com/privacy-policy/82074357/cookie-policy"
              className="iubenda-white iubenda-noiframe iubenda-embed hover:text-text-primary transition-colors"
              title={t("cookiePolicy")}
            >
              {t("cookiePolicy")}
            </a>
          </nav>
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
