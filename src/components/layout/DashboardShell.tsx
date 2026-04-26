"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { UserRole } from "@/types/enums";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type DashboardShellProps = {
  role: UserRole;
  userFullName: string;
  children: React.ReactNode;
};

export function DashboardShell({ role, userFullName, children }: DashboardShellProps) {
  const tCommon = useTranslations("common");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Window-scroll layout: the document body is the scroller, not a nested
  // container. This restores Next.js's automatic scroll-to-top on navigation
  // and native back/forward scroll restoration. Sidebar/Topbar pin via sticky
  // positioning instead of being flex children of an `overflow-hidden` parent.
  return (
    <div className="bg-bg-dashboard flex min-h-screen">
      <a
        href="#main-content"
        className="focus:bg-primary-500 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-lg focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        {tCommon("skipToContent")}
      </a>
      <Sidebar
        role={role}
        userFullName={userFullName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userFullName={userFullName} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
