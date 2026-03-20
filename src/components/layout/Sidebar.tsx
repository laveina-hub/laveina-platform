"use client";

import {
  Box,
  LayoutDashboard,
  MapPin,
  QrCode,
  Settings,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
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
  return [{ label: t("myShipments"), href: "/customer", icon: Box }];
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

  const roleLabelMap: Record<UserRole, string> = {
    admin: t("roleAdmin"),
    pickup_point: t("rolePickupPoint"),
    customer: t("roleCustomer"),
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <Link href="/" className="font-display text-primary-500 text-xl font-bold">
            Laveina
          </Link>
          <button
            onClick={onClose}
            className="focus-visible:ring-primary-500 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            aria-label={tCommon("closeSidebar")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-4 pb-2">
          <span className="bg-primary-50 text-primary-700 inline-block rounded-full px-3 py-1 text-xs font-medium">
            {roleLabelMap[role]}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon size={18} className={isActive ? "text-primary-600" : "text-gray-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary-500 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">
              {userFullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{userFullName}</p>
              <p className="truncate text-xs text-gray-500">{roleLabelMap[role]}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
