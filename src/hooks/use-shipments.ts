"use client";

import { useQuery } from "@tanstack/react-query";

import { throwApiError } from "@/lib/api-error";
import type { PaginatedResponse } from "@/types/api";
import type { ShipmentStatus } from "@/types/enums";
import type { Shipment, ShipmentWithRelations } from "@/types/shipment";

export type ShipmentFilters = {
  page?: number;
  pageSize?: number;
  status?: ShipmentStatus;
  pickupPointId?: string;
  customerId?: string;
  search?: string;
};

async function fetchShipments(filters: ShipmentFilters): Promise<PaginatedResponse<Shipment>> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.status) params.set("status", filters.status);
  if (filters.pickupPointId) params.set("pickupPointId", filters.pickupPointId);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.search) params.set("search", filters.search);

  const response = await fetch(`/api/shipments?${params.toString()}`);

  if (!response.ok) {
    await throwApiError(response, "Failed to fetch shipments");
  }

  const result = await response.json();
  return result.data;
}

async function fetchShipment(id: string): Promise<ShipmentWithRelations> {
  const response = await fetch(`/api/shipments/${id}`);

  if (!response.ok) {
    await throwApiError(response, "Failed to fetch shipment");
  }

  const result = await response.json();
  return result.data;
}

async function fetchShipmentByTracking(trackingId: string): Promise<ShipmentWithRelations> {
  const response = await fetch(`/api/shipments/tracking/${encodeURIComponent(trackingId)}`);

  if (!response.ok) {
    await throwApiError(response, "Failed to fetch shipment");
  }

  const result = await response.json();
  return result.data;
}

export function useShipments(filters: ShipmentFilters = {}, { enabled = true } = {}) {
  const { page, pageSize, status, pickupPointId, customerId, search } = filters;
  return useQuery({
    queryKey: ["shipments", page, pageSize, status, pickupPointId, customerId, search],
    queryFn: () => fetchShipments(filters),
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: ["shipment", id],
    queryFn: () => fetchShipment(id!),
    enabled: !!id,
  });
}

export function useShipmentByTracking(trackingId: string | undefined) {
  return useQuery({
    queryKey: ["shipment", "tracking", trackingId],
    queryFn: () => fetchShipmentByTracking(trackingId!),
    enabled: !!trackingId,
  });
}
