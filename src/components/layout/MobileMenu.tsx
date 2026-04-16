"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, useCallback } from "react";

import { Button, ButtonLink } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";
import { NAV_LINKS } from "@/constants/nav";
import { useAuth } from "@/hooks/use-auth";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcherMobile } from "./LocaleSwitcherMobile";

const DASHBOARD_PATHS: Record<string, string> = {
  admin: "/admin",
  pickup_point: "/pickup-point",
};

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const close = useCallback(() => {
    setIsAnimating(false);
    const timeout = setTimeout(() => setIsOpen(false), 300);
    return () => clearTimeout(timeout);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      setIsOpen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    }
  }, [isOpen, close]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        close();
        buttonRef.current?.focus();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only react to pathname changes
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    function handleTabTrap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTabTrap);
    return () => document.removeEventListener("keydown", handleTabTrap);
  }, [isOpen]);

  // SAFETY: user_metadata values are untyped
  const role = user?.user_metadata?.role as string | undefined;
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await signOut();
    close();
    router.push("/");
    router.refresh();
  }
  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        onClick={toggle}
        className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/60 active:bg-white/80"
        aria-label={isOpen ? t("closeMenu") : t("openMenu")}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
      >
        <Menu size={24} className="text-text-primary" aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <div
            className={cn(
              "bg-text-primary/40 fixed inset-0 z-40 transition-opacity duration-300",
              isAnimating ? "opacity-100" : "opacity-0"
            )}
            aria-hidden="true"
            onClick={close}
          />

          <nav
            ref={panelRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={tCommon("mobileNavigation")}
            className={cn(
              "bg-bg-primary fixed top-0 right-0 z-50 flex h-full w-72 flex-col shadow-xl transition-transform duration-300 ease-out sm:w-80",
              isAnimating ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="border-border-default flex h-19 shrink-0 items-center justify-between border-b px-6">
              <Image
                src="/images/header/logo-laveina.svg"
                alt={t("home")}
                width={120}
                height={35}
                unoptimized
                className="h-9 w-auto"
              />
              <button
                onClick={close}
                className="hover:bg-bg-muted active:bg-border-muted flex h-10 w-10 items-center justify-center rounded-md transition-colors"
                aria-label={t("closeMenu")}
              >
                <CloseIcon size={20} className="text-text-primary" />
              </button>
            </div>

            {user && (
              <div className="border-border-default flex items-center gap-3 border-b px-6 py-4">
                <span className="bg-primary-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="text-text-primary truncate text-sm font-medium">{displayName}</p>
                  <p className="text-text-muted truncate text-xs">{user.email}</p>
                </div>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto px-4 py-4">
              {NAV_LINKS.map(({ key, href }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      prefetch={true}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-500"
                          : "text-text-primary hover:bg-bg-muted hover:text-primary-500"
                      )}
                    >
                      {t(key)}
                    </Link>
                  </li>
                );
              })}

              {user && (
                <li>
                  <Link
                    href={DASHBOARD_PATHS[role ?? ""] ?? "/customer"}
                    className="text-text-primary hover:bg-bg-muted hover:text-primary-500 flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors"
                  >
                    {t("dashboard")}
                  </Link>
                </li>
              )}
            </ul>

            <div className="border-border-default shrink-0 space-y-3 border-t p-4">
              <LocaleSwitcherMobile />

              {loading ? (
                <div className="bg-primary-200 h-10 animate-pulse rounded-lg" />
              ) : user ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 bg-red-50 py-3 font-semibold text-red-600 hover:bg-red-100 active:bg-red-200 active:text-red-700"
                  onClick={handleSignOut}
                >
                  {t("logout")}
                </Button>
              ) : (
                <ButtonLink
                  href="/auth/login"
                  variant="primary"
                  size="sm"
                  className="block w-full py-3 text-center font-semibold"
                >
                  {t("signIn")}
                </ButtonLink>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
