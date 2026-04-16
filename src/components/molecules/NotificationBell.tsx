"use client";

import { Bell } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import {
  useNotificationRealtime,
  useUnreadNotificationCount,
} from "@/hooks/use-admin-notifications";

// Lazy-load panel — only downloads JS when bell is clicked (saves ~8KB from Lucide icons)
const NotificationPanel = dynamic(
  () => import("./NotificationPanel").then((mod) => ({ default: mod.NotificationPanel })),
  { ssr: false }
);

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();

  useNotificationRealtime();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="text-text-muted hover:bg-bg-muted hover:text-text-primary relative rounded-lg p-2"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-50 mt-2">
            <NotificationPanel onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
