"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/atoms";
import { NAV_LINKS } from "@/constants/nav";
import { useAuth } from "@/hooks/use-auth";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./LocaleSwitcher";

function getDashboardPath(role?: string): string {
  if (role === "admin") return "/admin";
  if (role === "pickup_point") return "/pickup-point";
  return "/customer";
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 14H3.333A1.333 1.333 0 0 1 2 12.667V3.333A1.333 1.333 0 0 1 3.333 2H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.667 11.333 14 8l-3.333-3.333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 8H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserMenu() {
  const t = useTranslations("nav");
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  const role = user?.user_metadata?.role as string | undefined;
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";
  const email = user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    close();
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger — pill style matching LocaleSwitcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "group flex items-center gap-2.5 rounded-full border px-2 py-1.5 transition-all duration-200 xl:px-3 xl:py-2",
          open
            ? "border-primary-300 bg-white shadow-sm"
            : "hover:border-primary-200 border-transparent hover:bg-white/80"
        )}
      >
        <span className="bg-primary-500 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-wider text-white xl:h-8 xl:w-8 xl:text-xs">
          {initials}
        </span>
        <span className="text-text-primary max-w-28 truncate text-sm font-semibold xl:text-base">
          {displayName}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={cn(
            "text-text-muted shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {/* Dropdown — matching LocaleSwitcher style */}
      <div
        className={cn(
          "absolute right-0 z-50 mt-3 w-56 origin-top-right transition-all duration-200",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <div
          role="menu"
          className="overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-black/6"
        >
          {/* User info header */}
          <div className="border-border-muted mb-1.5 border-b px-3 pt-1 pb-3">
            <p className="text-text-primary truncate text-sm font-semibold">{displayName}</p>
            <p className="text-text-muted truncate text-xs">{email}</p>
          </div>

          {/* Dashboard */}
          <Link
            href={getDashboardPath(role)}
            role="menuitem"
            onClick={close}
            className="group hover:bg-bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150"
          >
            <span className="bg-bg-muted text-text-muted group-hover:bg-primary-100 group-hover:text-primary-700 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors">
              <DashboardIcon />
            </span>
            <span className="text-text-primary text-sm font-semibold">{t("dashboard")}</span>
          </Link>

          {/* Log out */}
          <button
            role="menuitem"
            onClick={handleSignOut}
            className="group hover:bg-bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150"
          >
            <span className="bg-bg-muted text-text-muted group-hover:bg-error/10 group-hover:text-error flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors">
              <LogoutIcon />
            </span>
            <span className="text-text-primary group-hover:text-error text-sm font-semibold transition-colors">
              {t("logout")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

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
