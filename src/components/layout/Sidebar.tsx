"use client";

import {
  Bell,
  Bookmark,
  Box,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  QrCode,
  Settings,
  ShieldCheck,
  Star,
  Truck,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ElementType } from "react";

import { Button } from "@/components/atoms";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/enums";

type NavItem = {
  label: string;
  href: string;
  icon: ElementType;
};

type NavGroup = {
  /** Heading translation key under `dashboard.group.*`. Optional — first group
   *  on each role is intentionally headerless to match the existing visual. */
  headingKey?: "primary" | "account";
  items: NavItem[];
};

// Q14.2 — Customer dashboard nav split into two groups so users can find
// account-y settings without scanning the whole list. Primary group is
// task-oriented (book / track / inbox); Account group is settings + history.
function getNavGroups(
  role: UserRole,
  t: ReturnType<typeof useTranslations<"dashboard">>
): NavGroup[] {
  if (role === "admin") {
    return [
      {
        items: [
          { label: t("overview"), href: "/admin", icon: LayoutDashboard },
          { label: t("shipments"), href: "/admin/shipments", icon: Box },
          { label: t("pickupPoints"), href: "/admin/pickup-points", icon: MapPin },
          { label: t("users"), href: "/admin/users", icon: Users },
          { label: t("dispatch"), href: "/admin/dispatch", icon: Truck },
          { label: t("ratings"), href: "/admin/ratings", icon: Star },
          { label: t("support"), href: "/admin/support", icon: HelpCircle },
          { label: t("settings"), href: "/admin/settings", icon: Settings },
        ],
      },
    ];
  }

  if (role === "pickup_point") {
    return [
      {
        items: [
          { label: t("overview"), href: "/pickup-point", icon: LayoutDashboard },
          { label: t("scan"), href: "/pickup-point/scan", icon: QrCode },
          { label: t("verify"), href: "/pickup-point/verify", icon: ShieldCheck },
          { label: t("settings"), href: "/pickup-point/settings", icon: Settings },
        ],
      },
    ];
  }

  return [
    {
      headingKey: "primary",
      items: [
        { label: t("overview"), href: "/customer", icon: LayoutDashboard },
        { label: t("myShipments"), href: "/customer/shipments", icon: Box },
        { label: t("notifications"), href: "/customer/notifications", icon: Bell },
      ],
    },
    {
      headingKey: "account",
      items: [
        { label: t("payments"), href: "/customer/payments", icon: CreditCard },
        { label: t("addresses"), href: "/customer/addresses", icon: Bookmark },
        { label: t("profile"), href: "/customer/profile", icon: User },
        { label: t("ratings"), href: "/customer/ratings", icon: Star },
        { label: t("support"), href: "/customer/support", icon: HelpCircle },
      ],
    },
  ];
}

type SidebarProps = {
  role: UserRole;
  userFullName: string;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ role, userFullName: _userFullName, open, onClose }: SidebarProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const navGroups = getNavGroups(role, t);
  const isCustomer = role === "customer";

  function isItemActive(href: string): boolean {
    const root = `/${role === "pickup_point" ? "pickup-point" : role}`;
    return href === root ? pathname === href : pathname.startsWith(href);
  }

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
          "border-border-default fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r bg-white transition-transform duration-200",
          // Desktop: sticky to viewport top with its own height so long sidebar
          // nav scrolls independently while the page scroll stays on window.
          // `self-start` opts out of the parent flex container's stretch so
          // sticky has room to operate.
          "lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:translate-x-0 lg:self-start lg:transition-none",
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
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Q14.2 — top-level "Send a parcel" CTA on customer dashboards. The
            Topbar carries the same affordance on desktop, but having it here
            too means users opening the sidebar on mobile have a single tap
            from any page back to the booking flow. */}
        {isCustomer && (
          <div className="px-3 pt-3">
            <Link href="/book" onClick={onClose}>
              <Button size="md" className="w-full justify-center gap-2">
                <PlusIcon size={16} />
                {t("bookShipment")}
              </Button>
            </Link>
          </div>
        )}

        <nav className="flex-1 space-y-2 overflow-y-auto py-3 pl-3">
          {navGroups.map((group, groupIdx) => (
            <div key={group.headingKey ?? groupIdx} className="space-y-1">
              {group.headingKey ? (
                <p className="text-text-muted px-4 pt-2 text-[11px] font-semibold tracking-wider uppercase">
                  {t(`group.${group.headingKey}`)}
                </p>
              ) : (
                groupIdx === 0 && (
                  <p className="text-text-muted px-4 pt-2 text-[11px] font-semibold tracking-wider uppercase">
                    {t("menu")}
                  </p>
                )
              )}
              {group.items.map((item) => {
                const isActive = isItemActive(item.href);
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
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
