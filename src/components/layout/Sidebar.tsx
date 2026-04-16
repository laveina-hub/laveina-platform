"use client";

import {
  Box,
  LayoutDashboard,
  MapPin,
  QrCode,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ElementType } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/enums";

type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
};

function getNavItems(
  role: UserRole,
  t: ReturnType<typeof useTranslations<"dashboard">>
): NavItem[] {
  if (role === "admin") {
    return [
      { label: t("overview"), href: "/admin", icon: LayoutDashboard },
      { label: t("shipments"), href: "/admin/shipments", icon: Box },
      { label: t("pickupPoints"), href: "/admin/pickup-points", icon: MapPin },
      { label: t("users"), href: "/admin/users", icon: Users },
      { label: t("dispatch"), href: "/admin/dispatch", icon: Truck },
      { label: t("settings"), href: "/admin/settings", icon: Settings },
    ];
  }

  if (role === "pickup_point") {
    return [
      { label: t("overview"), href: "/pickup-point", icon: LayoutDashboard },
      { label: t("scan"), href: "/pickup-point/scan", icon: QrCode },
      { label: t("verify"), href: "/pickup-point/verify", icon: ShieldCheck },
      { label: t("settings"), href: "/pickup-point/settings", icon: Settings },
    ];
  }

  // customer
  return [{ label: t("myShipments"), href: "/customer", icon: LayoutDashboard }];
}

type SidebarProps = {
  role: UserRole;
  userFullName: string;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ role, userFullName, open, onClose }: SidebarProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const navItems = getNavItems(role, t);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "border-border-default fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/header/logo-laveina.svg"
              alt={tCommon("appName")}
              width={120}
              height={35}
              priority
            />
          </Link>
          <button
            onClick={onClose}
            className="focus-visible:ring-primary-500 text-text-muted hover:bg-bg-muted hover:text-text-primary rounded-md p-1 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            aria-label={tCommon("closeSidebar")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
            {t("menu")}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto py-1 pl-3">
          {navItems.map((item) => {
            const isActive =
              item.href === `/${role === "pickup_point" ? "pickup-point" : role}`
                ? pathname === item.href
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary-500 rounded-l-xl text-white"
                    : "text-text-light hover:bg-bg-muted hover:text-text-primary rounded-l-xl"
                )}
              >
                <Icon size={20} className={isActive ? "text-white" : "text-text-muted"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
