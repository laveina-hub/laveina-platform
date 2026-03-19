"use client";

import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/atoms";
import { NAV_LINKS } from "@/constants/nav";
import { useAuth } from "@/hooks/use-auth";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { UserMenu } from "./UserMenu";

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user, loading } = useAuth();

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

      {loading ? (
        <div className="bg-primary-200 h-10 w-24 animate-pulse rounded-lg xl:h-14 xl:w-32" />
      ) : user ? (
        <UserMenu />
      ) : (
        <ButtonLink
          href="/auth/login"
          variant="primary"
          size="nav"
          className="text-base xl:text-xl"
        >
          {t("signIn")}
        </ButtonLink>
      )}
    </nav>
  );
}
