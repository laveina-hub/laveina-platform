"use client";

import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/atoms";
import { NAV_LINKS } from "@/constants/nav";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./LocaleSwitcher";

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-6 lg:flex lg:gap-10" aria-label="Main navigation">
      {NAV_LINKS.map(({ key, href }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "text-base font-medium transition-colors xl:text-xl",
              isActive ? "text-primary-500" : "text-text-primary hover:text-primary-500"
            )}
          >
            {t(key)}
          </Link>
        );
      })}

      <LocaleSwitcher />

      <ButtonLink href="/auth/login" variant="primary" size="nav">
        {t("signIn")}
      </ButtonLink>
    </nav>
  );
}
