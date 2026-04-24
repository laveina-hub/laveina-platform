"use client";

import { useQuery } from "@tanstack/react-query";

import { throwApiError } from "@/lib/api-error";
import type { PaginatedResponse } from "@/types/api";
import type { PickupPoint, PickupPointWithOverrides } from "@/types/pickup-point";

export type PickupPointFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

async function fetchPickupPoints(
  postcode?: string,
  search?: string
): Promise<PickupPointWithOverrides[]> {
  const params = new URLSearchParams();
  if (postcode) params.set("postcode", postcode);
  if (search) params.set("search", search);

  const url = `/api/pickup-points${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    await throwApiError(response, "Failed to fetch pickup points");
  }

  const result = await response.json();
  return result.data;
}

async function fetchPickupPointsPaginated(
  filters: PickupPointFilters
): Promise<PaginatedResponse<PickupPoint>> {
  const params = new URLSearchParams();
  params.set("include_inactive", "true");

  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);

  const response = await fetch(`/api/pickup-points?${params.toString()}`);

  if (!response.ok) {
    await throwApiError(response, "Failed to fetch pickup points");
  }

  const result = await response.json();
  return result.data;
}

async function fetchPickupPoint(id: string): Promise<PickupPoint> {
  const response = await fetch(`/api/pickup-points/${id}`);

  if (!response.ok) {
    await throwApiError(response, "Failed to fetch pickup point");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Public pickup-point lookup. Either `postcode` or `search` (≥3 chars) must
 * be provided to enable the query; otherwise we don't bother hitting the
 * API. The `search` path matches name/address/city/postcode (Q6.5).
 */
export function usePickupPoints(postcode?: string, search?: string) {
  const trimmedSearch = search?.trim() ?? "";
  const enabled = !!postcode || trimmedSearch.length >= 3;
  return useQuery<PickupPointWithOverrides[]>({
    queryKey: ["pickup-points", postcode, trimmedSearch],
    queryFn: () => fetchPickupPoints(postcode, trimmedSearch || undefined),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminPickupPoints(filters: PickupPointFilters = {}) {
  const { page, pageSize, search } = filters;
  return useQuery({
    queryKey: ["pickup-points", "admin", page, pageSize, search],
    queryFn: () => fetchPickupPointsPaginated(filters),
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function usePickupPoint(id: string | undefined) {
  return useQuery({
    queryKey: ["pickup-point", id],
    queryFn: () => fetchPickupPoint(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
