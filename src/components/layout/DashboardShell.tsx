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

  return (
    <div className="flex h-screen overflow-hidden">
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userFullName={userFullName} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main
          id="main-content"
          className="bg-bg-dashboard flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
