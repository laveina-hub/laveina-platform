"use client";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        userFullName={userFullName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userFullName={userFullName} onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
