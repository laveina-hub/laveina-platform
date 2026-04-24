import Image from "next/image";
import Script from "next/script";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { FooterLocaleSwitcher } from "./FooterLocaleSwitcher";

// Sprint 5 chunk 1 (client spec — M2_M3_SCREEN_SPECIFICATIONS §2.3):
//   - 4-column link grid (Services · Support · Company · Legal)
//   - Bottom row: C5 legal block (LAVEINA TECH S.L. · NIF B70881610 · etc.)
//     + social icons + language switcher
//   - Iubenda handles Terms / Privacy / Cookie pages
// Items that don't have a dedicated page yet point at /coming-soon so the
// nav stays consistent without 404s.

// C5 (client answer 2026-04-21) hard-coded here — single-tenant value and
// mirrors the invoice template's seller block.
const C5 = {
  legalName: "LAVEINA TECH, SOCIEDAD LIMITADA",
  nif: "B70881610",
  addressLine1: "C/ Rambla de l'Exposició, 103, Planta 1",
  addressLine2: "08800 Vilanova i la Geltrú, Barcelona",
  phone: "+34 934 652 923",
  email: "info@laveina.co",
} as const;

type FooterLink = {
  label: string;
  href: string;
};

export async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");

  // Columns per spec Q1.4. Pages not yet built route to /coming-soon so the
  // nav stays consistent without 404s (existing project convention).
  const servicesLinks: FooterLink[] = [
    { label: tNav("request"), href: "/book" },
    { label: tNav("tracking"), href: "/tracking" },
    { label: t("businessSolutions"), href: "/coming-soon" },
    { label: t("internationalShipping"), href: "/coming-soon" },
  ];

  const supportLinks: FooterLink[] = [
    { label: t("helpCenter"), href: "/coming-soon" },
    { label: tNav("contact"), href: "/contact" },
    { label: t("shippingGuide"), href: "/coming-soon" },
    { label: t("faq"), href: "/coming-soon" },
  ];

  const companyLinks: FooterLink[] = [
    { label: tNav("about"), href: "/about" },
    { label: t("careers"), href: "/coming-soon" },
    { label: t("press"), href: "/coming-soon" },
    { label: t("sustainability"), href: "/coming-soon" },
  ];

  const socialLinks = [
    { key: "instagram", label: "Instagram", icon: "/images/footer-info-bar/icon-instagram.svg" },
    { key: "facebook", label: "Facebook", icon: "/images/footer-info-bar/icon-facebook.svg" },
    { key: "twitter", label: "Twitter / X", icon: "/images/footer-info-bar/icon-twitter.svg" },
    { key: "whatsapp", label: "WhatsApp", icon: "/images/footer-info-bar/icon-whatsapp.svg" },
  ] as const;

  return (
    <footer className="border-border-default bg-bg-secondary overflow-hidden border-t">
      <div className="max-w-container mx-auto px-6 pt-14 pb-8 lg:px-10 lg:pt-16">
        {/* Top section: brand + 4 link columns */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
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
            <address className="text-text-muted mt-4 text-xs leading-5 not-italic">
              <a
                href={`tel:${C5.phone.replace(/\s/g, "")}`}
                className="hover:text-primary-600 block"
              >
                {C5.phone}
              </a>
              <a href={`mailto:${C5.email}`} className="hover:text-primary-600 block">
                {C5.email}
              </a>
            </address>
          </div>

          {/* Link columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
            <FooterColumn title={t("columnServices")} links={servicesLinks} />
            <FooterColumn title={t("columnSupport")} links={supportLinks} />
            <FooterColumn title={t("columnCompany")} links={companyLinks} />
            <LegalColumn
              title={t("columnLegal")}
              termsLabel={t("terms")}
              privacyLabel={t("privacy")}
              cookieLabel={t("cookiePolicy")}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-border-default mt-10 border-t" aria-hidden />

        {/* C5 legal block */}
        <div className="mt-6 text-center text-xs leading-5">
          <p className="text-text-primary font-medium">{C5.legalName}</p>
          <p className="text-text-muted">
            {t("nifLine", { nif: C5.nif })} · {C5.addressLine1} · {C5.addressLine2}
          </p>
          {/* Q16.2 — carrier partnership disclaimer (fine print). Keeps
              customer-facing branding on Laveina while acknowledging that
              nationwide coverage relies on certified carrier partners. */}
          <p className="text-text-muted mt-2 italic">{t("carrierDisclaimer")}</p>
        </div>

        {/* Bottom row: copyright + social + locale switcher */}
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-text-muted text-xs">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>

          <div className="flex items-center gap-4">
            <ul className="inline-flex items-center gap-3" aria-label={t("socialAriaLabel")}>
              {socialLinks.map((social) => (
                <li key={social.key}>
                  <a
                    href="#"
                    aria-label={social.label}
                    className="text-text-muted block hover:opacity-80"
                  >
                    <Image
                      src={social.icon}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      className="h-5 w-5"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
            <span aria-hidden className="bg-border-default h-4 w-px" />
            <FooterLocaleSwitcher />
          </div>
        </div>
      </div>

      {/* Decorative footer logo (unchanged — part of brand background) */}
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

// ── helpers ────────────────────────────────────────────────────────────────

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="font-body text-text-primary text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className="text-text-muted hover:text-primary-600 text-sm transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegalColumn({
  title,
  termsLabel,
  privacyLabel,
  cookieLabel,
}: {
  title: string;
  termsLabel: string;
  privacyLabel: string;
  cookieLabel: string;
}) {
  return (
    <div>
      <h3 className="font-body text-text-primary text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        <li>
          <a
            href="https://www.iubenda.com/condiciones-de-uso/82074357"
            className="iubenda-white iubenda-noiframe iubenda-embed text-text-muted hover:text-primary-600 text-sm transition-colors"
            title={termsLabel}
          >
            {termsLabel}
          </a>
        </li>
        <li>
          <a
            href="https://www.iubenda.com/privacy-policy/82074357"
            className="iubenda-white iubenda-noiframe iubenda-embed text-text-muted hover:text-primary-600 text-sm transition-colors"
            title={privacyLabel}
          >
            {privacyLabel}
          </a>
        </li>
        <li>
          <a
            href="https://www.iubenda.com/privacy-policy/82074357/cookie-policy"
            className="iubenda-white iubenda-noiframe iubenda-embed text-text-muted hover:text-primary-600 text-sm transition-colors"
            title={cookieLabel}
          >
            {cookieLabel}
          </a>
        </li>
      </ul>
    </div>
  );
}
