"use client";

import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  PackageCheck,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  useAdminNotifications,
  useMarkAllAsRead,
  useMarkAsRead,
} from "@/hooks/use-admin-notifications";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AdminNotification, NotificationType } from "@/types/notification";

const ICON_MAP: Record<NotificationType, typeof CreditCard> = {
  new_booking_paid: CreditCard,
  parcel_received_at_origin: PackageCheck,
  dispatch_failed: AlertTriangle,
  delivery_problem: AlertOctagon,
  parcel_returned: Undo2,
  parcel_delivered: CheckCircle,
};

const ICON_COLOR_MAP: Record<NotificationType, string> = {
  new_booking_paid: "text-blue-500",
  parcel_received_at_origin: "text-green-500",
  dispatch_failed: "text-amber-500",
  delivery_problem: "text-red-500",
  parcel_returned: "text-red-500",
  parcel_delivered: "text-green-500",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-300",
  normal: "bg-blue-400",
  high: "bg-amber-400",
  critical: "bg-red-500",
};

type Props = { onClose: () => void };

export function NotificationPanel({ onClose }: Props) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading } = useAdminNotifications(filter);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleClick = (notification: AdminNotification) => {
    if (notification.status === "unread") {
      markAsRead.mutate(notification.id);
    }
    if (notification.shipment_id) {
      router.push(`/admin/shipments/${notification.shipment_id}`);
      onClose();
    }
  };

  return (
    <div className="border-border-default w-96 rounded-xl border bg-white shadow-lg">
      <div className="border-border-default flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-text-primary font-semibold">{t("title")}</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            className="text-primary-500 text-xs hover:underline"
            disabled={markAllAsRead.isPending}
          >
            {t("markAllAsRead")}
          </button>
        )}
      </div>

      <div className="border-border-default flex border-b">
        {(["all", "unread"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "flex-1 py-2 text-center text-sm transition-colors",
              filter === tab
                ? "border-primary-500 text-primary-500 border-b-2 font-medium"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {t(tab === "all" ? "filterAll" : "filterUnread")}
            {tab === "unread" && unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 text-xs text-red-600">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-text-muted text-sm">{t("allCaughtUp")}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={() => handleClick(n)} />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: AdminNotification;
  onClick: () => void;
}) {
  const t = useTranslations("notifications");
  const Icon = ICON_MAP[notification.type] ?? CreditCard;
  const iconColor = ICON_COLOR_MAP[notification.type] ?? "text-gray-500";
  const priorityDot = PRIORITY_COLOR[notification.priority] ?? "bg-gray-300";
  const isUnread = notification.status === "unread";

  // Map snake_case DB type → camelCase i18n key (e.g. "new_booking_paid" → "newBookingPaid")
  // SAFETY: notification.metadata is stored as a JSON object with string values matching i18n interpolation params
  const metadata = notification.metadata as Record<string, string>;
  const typeKey = notification.type.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

  // SAFETY: i18n keys are defined in locale files as notifications.{typeKey}.title/description
  const title = t(`${typeKey}.title` as Parameters<typeof t>[0], metadata);
  const description = t(`${typeKey}.description` as Parameters<typeof t>[0], metadata);

  return (
    <button
      onClick={onClick}
      className={cn(
        "hover:bg-bg-muted flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        isUnread && "bg-blue-50/50"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", iconColor)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm",
              isUnread ? "text-text-primary font-semibold" : "text-text-light"
            )}
          >
            {title}
          </p>
          {isUnread && <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot)} />}
        </div>
        {description && <p className="text-text-muted mt-0.5 truncate text-xs">{description}</p>}
        <p className="text-text-muted mt-1 text-xs">
          <TimeAgo date={notification.created_at} />
        </p>
      </div>
    </button>
  );
}

function TimeAgo({ date }: { date: string }) {
  const t = useTranslations("notifications");
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return <>{t("justNow")}</>;
  if (diffMin < 60) return <>{t("minutesAgo", { count: diffMin })}</>;
  if (diffHours < 24) return <>{t("hoursAgo", { count: diffHours })}</>;
  return <>{t("daysAgo", { count: diffDays })}</>;
}
