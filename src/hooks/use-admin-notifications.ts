"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import type { AdminNotification } from "@/types/notification";

type NotificationsResponse = {
  notifications: AdminNotification[];
  unreadCount: number;
  total: number;
};

const QUERY_KEY = ["admin", "notifications"] as const;

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch("/api/admin/notifications?status=all&limit=50");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const result = await res.json();
  return result.data;
}

/** Single query for all notification data. Panel filters client-side. */
export function useAdminNotifications(filter: "unread" | "all" = "all") {
  const query = useQuery({
    queryKey: [...QUERY_KEY],
    queryFn: fetchNotifications,
    staleTime: 2 * 60 * 1000,
  });

  // Client-side filter — no extra API call when switching tabs
  const filtered = useMemo(() => {
    if (!query.data) return undefined;
    const notifications =
      filter === "unread"
        ? query.data.notifications.filter((n) => n.status === "unread")
        : query.data.notifications;
    return { ...query.data, notifications };
  }, [query.data, filter]);

  return { ...query, data: filtered };
}

/** Unread count derived from the same cached query — zero extra API calls. */
export function useUnreadNotificationCount() {
  const { data } = useQuery({
    queryKey: [...QUERY_KEY],
    queryFn: fetchNotifications,
    staleTime: 2 * 60 * 1000,
  });
  return data?.unreadCount ?? 0;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      queryClient.setQueriesData<NotificationsResponse>({ queryKey: QUERY_KEY }, (old) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: Math.max(0, old.unreadCount - 1),
          notifications: old.notifications.map((n) =>
            n.id === notificationId
              ? { ...n, status: "read" as const, read_at: new Date().toISOString() }
              : n
          ),
        };
      });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      queryClient.setQueriesData<NotificationsResponse>({ queryKey: QUERY_KEY }, (old) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: 0,
          notifications: old.notifications.map((n) => ({
            ...n,
            status: "read" as const,
            read_at: n.read_at ?? new Date().toISOString(),
          })),
        };
      });
    },
  });
}

/** Subscribe to Supabase real-time for NEW notifications only. */
export function useNotificationRealtime() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidate]);
}
