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
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { user, loading } = useAuth();

  return (
    <nav
      className="hidden items-center gap-3 lg:flex xl:gap-6"
      aria-label={tCommon("mainNavigation")}
    >
      {NAV_LINKS.map(({ key, href }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={key}
            href={href}
            prefetch={true}
            className={cn(
              "text-sm font-medium whitespace-nowrap transition-colors xl:text-base",
              isActive ? "text-primary-500" : "text-text-primary hover:text-primary-500"
            )}
          >
            {t(key)}
          </Link>
        );
      })}

      <LocaleSwitcher />

      {loading ? (
        <div className="bg-primary-200 h-9 w-20 animate-pulse rounded-lg xl:h-11 xl:w-28" />
      ) : user ? (
        <UserMenu />
      ) : (
        <ButtonLink
          href="/auth/login"
          variant="primary"
          size="nav"
          className="text-sm whitespace-nowrap xl:text-base"
        >
          {t("signIn")}
        </ButtonLink>
      )}
    </nav>
  );
}
