"use client";

import { useQuery } from "@tanstack/react-query";

export type AdminStats = {
  totalShipments: number;
  waitingAtOrigin: number;
  receivedAtOrigin: number;
  inTransit: number;
  readyForPickup: number;
  delivered: number;
  totalRevenueCents: number;
  activePickupPoints: number;
  recentShipments: {
    id: string;
    tracking_id: string;
    status: string;
    delivery_mode: string;
    parcel_size: string;
    price_cents: number;
    created_at: string;
    sender_name: string;
    receiver_name: string;
  }[];
};

async function fetchAdminStats(): Promise<AdminStats> {
  const response = await fetch("/api/admin/stats");

  if (!response.ok) {
    throw new Error("Failed to fetch admin stats");
  }

  const result = await response.json();
  return result.data;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });
}
