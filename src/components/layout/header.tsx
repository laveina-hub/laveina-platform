import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function Header() {
  const t = useTranslations("header");

  return (
    <header className="bg-primary-100 sticky top-0 z-50">
      <div className="max-w-container mx-auto flex items-center justify-between px-6 py-4 lg:px-10 lg:py-7">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label={t("logoAriaLabel")}>
          <Image
            src="/images/header/logo-laveina.svg"
            alt={t("logoAlt")}
            width={148}
            height={43}
            priority
            unoptimized
            className="h-9 w-auto xl:h-16"
          />
        </Link>

        {/* Desktop & Tablet: inline nav with Sign In */}
        <NavLinks />

        {/* Mobile: hamburger toggle + slide-down menu */}
        <MobileMenu />
      </div>
    </header>
  );
}
