"use client";

import { LogOut, Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { NotificationBell } from "@/components/molecules/NotificationBell";
import { useAuth } from "@/hooks/use-auth";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type TopbarProps = {
  userFullName: string;
  onMenuToggle: () => void;
};

export function Topbar({ userFullName, onMenuToggle }: TopbarProps) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/");
    router.refresh();
  }, [signOut, router]);

  // Derive page title from the last meaningful segment
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const segments = pathname.split("/").filter(Boolean);
  const meaningful = segments.filter((seg) => !UUID_RE.test(seg) && seg !== "new");
  const lastSegment = meaningful[meaningful.length - 1] ?? "";
  const pageTitle = lastSegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const initials = userFullName
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <header className="border-border-default flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="focus-visible:ring-primary-500 text-text-muted hover:bg-bg-muted hover:text-text-primary rounded-md p-2 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
          aria-label={tCommon("toggleMenu")}
        >
          <Menu size={20} />
        </button>

        <h1 className="text-text-primary text-lg font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search size={16} className="text-text-muted absolute top-1/2 left-3 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("searchShipment")}
            className="border-border-default bg-bg-secondary/60 text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:ring-primary-100 h-9 w-48 rounded-lg border pr-3 pl-9 text-sm focus:ring-2 focus:outline-none lg:w-64"
          />
        </div>

        <LocaleSwitcher />

        {pathname.startsWith("/admin") && <NotificationBell />}

        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((prev) => !prev)}
            className="bg-primary-500 hover:ring-primary-200 flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white shadow-xs ring-offset-2 transition-shadow hover:ring-2"
            title={userFullName}
          >
            {initials}
          </button>

          {avatarOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAvatarOpen(false)}
                aria-hidden="true"
              />
              <div className="border-border-default absolute top-full right-0 z-50 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg">
                <div className="border-border-muted border-b px-4 py-2">
                  <p className="text-text-primary truncate text-sm font-medium">{userFullName}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "text-text-muted hover:bg-bg-muted hover:text-text-primary flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors"
                  )}
                >
                  <LogOut size={16} />
                  {tNav("logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
