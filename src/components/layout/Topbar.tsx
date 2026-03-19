"use client";

import { LogOut, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type TopbarProps = {
  userFullName: string;
  onMenuToggle: () => void;
};

export function Topbar({ userFullName, onMenuToggle }: TopbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }, [router]);

  // Build breadcrumb from pathname — filter out UUIDs and dynamic [id] segments
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb = segments
    .filter((seg) => !UUID_RE.test(seg) && seg !== "new")
    .map((seg) => seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <nav className="hidden text-sm text-gray-500 sm:flex sm:items-center sm:gap-1.5">
          {breadcrumb.map((label, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">/</span>}
              <span
                className={cn(
                  i === breadcrumb.length - 1 ? "font-medium text-gray-900" : "text-gray-500"
                )}
              >
                {label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-gray-600 sm:block">{userFullName}</span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          title={t("logout")}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </div>
    </header>
  );
}
