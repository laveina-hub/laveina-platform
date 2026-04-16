"use client";

import { useQuery } from "@tanstack/react-query";

import type { UserRole } from "@/types/enums";

export type UserFilters = {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  search?: string;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  shipment_count: number;
};

type UserListResponse = {
  data: UserProfile[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  roleCounts: Record<string, number>;
};

async function fetchUsers(filters: UserFilters): Promise<UserListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.role) params.set("role", filters.role);
  if (filters.search) params.set("search", filters.search);

  const response = await fetch(`/api/admin/users?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to fetch users");
  }

  const result = await response.json();
  return result.data;
}

async function fetchUser(id: string): Promise<UserProfile> {
  const response = await fetch(`/api/admin/users/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to fetch user");
  }

  const result = await response.json();
  return result.data;
}

export function useUsers(filters: UserFilters = {}) {
  const { page, pageSize, role, search } = filters;
  return useQuery({
    queryKey: ["users", "admin", page, pageSize, role, search],
    queryFn: () => fetchUsers(filters),
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id!),
    staleTime: 60 * 1000,
    enabled: !!id,
  });
}
