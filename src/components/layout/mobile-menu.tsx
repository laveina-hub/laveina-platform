"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, useCallback } from "react";

import { ButtonLink } from "@/components/atoms";
import { CloseIcon } from "@/components/icons";
import { NAV_LINKS } from "@/constants/nav";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcherMobile } from "./locale-switcher-mobile";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const t = useTranslations("nav");
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setIsAnimating(false);
    // Wait for the exit animation before unmounting
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

  // Close on route change
  useEffect(() => {
    if (isOpen) {
      close();
    }
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleTabTrap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const focusable = panel.querySelectorAll<HTMLElement>(focusableSelector);
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

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        onClick={toggle}
        className="hover:bg-primary-200 active:bg-primary-300 flex h-10 w-10 items-center justify-center rounded-md transition-colors"
        aria-label={isOpen ? t("closeMenu") : t("openMenu")}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
      >
        {isOpen ? (
          <CloseIcon size={22} className="text-text-primary" />
        ) : (
          <Image
            src="/images/header/icon-hamburger-menu.svg"
            alt=""
            width={20}
            height={16}
            aria-hidden="true"
            unoptimized
          />
        )}
      </button>

      {/* Overlay + Slide-in panel */}
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className={cn(
              "bg-text-primary/40 fixed inset-0 z-40 transition-opacity duration-300",
              isAnimating ? "opacity-100" : "opacity-0"
            )}
            aria-hidden="true"
            onClick={close}
          />

          {/* Slide-in nav panel */}
          <nav
            ref={panelRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className={cn(
              "bg-bg-primary fixed top-0 right-0 z-50 flex h-full w-72 flex-col shadow-xl transition-transform duration-300 ease-out sm:w-80",
              isAnimating ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* Panel header */}
            <div className="border-border-default flex h-[76px] shrink-0 items-center justify-between border-b px-6">
              <Image
                src="/images/header/logo-laveina.svg"
                alt="Laveina"
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

            {/* Navigation links */}
            <ul className="flex-1 overflow-y-auto px-4 py-4">
              {NAV_LINKS.map(({ key, href }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <li key={key}>
                    <Link
                      href={href}
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
            </ul>

            {/* Language switcher + Sign In */}
            <div className="border-border-default shrink-0 space-y-3 border-t p-4">
              <LocaleSwitcherMobile />

              <ButtonLink
                href="/auth/login"
                variant="primary"
                size="sm"
                className="block w-full py-3 text-center font-semibold"
              >
                {t("signIn")}
              </ButtonLink>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
