"use client";

import { useQuery } from "@tanstack/react-query";

import type { PickupPoint } from "@/types/pickup-point";

async function fetchPickupPoints(postcode?: string): Promise<PickupPoint[]> {
  const params = new URLSearchParams();
  if (postcode) params.set("postcode", postcode);

  const url = `/api/pickup-points${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to fetch pickup points");
  }

  const result = await response.json();
  return result.data;
}

async function fetchPickupPoint(id: string): Promise<PickupPoint> {
  const response = await fetch(`/api/pickup-points/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to fetch pickup point");
  }

  const result = await response.json();
  return result.data;
}

export function usePickupPoints(postcode?: string) {
  return useQuery({
    queryKey: ["pickup-points", postcode],
    queryFn: () => fetchPickupPoints(postcode),
    enabled: !!postcode,
  });
}

export function usePickupPoint(id: string | undefined) {
  return useQuery({
    queryKey: ["pickup-point", id],
    queryFn: () => fetchPickupPoint(id!),
    enabled: !!id,
  });
}
