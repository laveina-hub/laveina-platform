"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { throwApiError, UnauthorizedError } from "@/lib/api-error";
import type { SavedAddressWithPickupPoint } from "@/services/saved-address.service";
import type { Database } from "@/types/database.types";
import type {
  CreateSavedAddressInput,
  UpdateSavedAddressInput,
} from "@/validations/saved-address.schema";

import { useAuth } from "./use-auth";

// GET /api/saved-addresses returns the joined shape (label + nested pickup
// point summary) so the dropdown can render name + postcode without a second
// fetch. POST/PATCH return just the base row — consumers invalidate and
// re-fetch the joined list.
export type SavedAddress = SavedAddressWithPickupPoint;
type SavedAddressRow = Database["public"]["Tables"]["saved_addresses"]["Row"];

const QUERY_KEY = ["saved-addresses"] as const;

async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const res = await fetch("/api/saved-addresses");
  if (!res.ok) {
    // 401 surfaces as UnauthorizedError via throwApiError; we treat it as
    // "no data" in the retry handler below.
    await throwApiError(res, "Failed to fetch saved addresses");
  }
  const json = await res.json();
  return json.data as SavedAddress[];
}

/**
 * Reads the current user's saved addresses. Returns an empty array for
 * unauthenticated users so callers don't need to branch.
 */
export function useSavedAddresses() {
  const { user } = useAuth();

  return useQuery<SavedAddress[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchSavedAddresses,
    enabled: !!user,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      // Don't retry past an UnauthorizedError — user simply isn't logged in.
      if (error instanceof UnauthorizedError) return false;
      return failureCount < 2;
    },
  });
}

async function createSavedAddressRequest(input: CreateSavedAddressInput): Promise<SavedAddressRow> {
  const res = await fetch("/api/saved-addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, "Failed to create saved address");
  const json = await res.json();
  return json.data as SavedAddressRow;
}

async function updateSavedAddressRequest(
  id: string,
  patch: UpdateSavedAddressInput
): Promise<SavedAddressRow> {
  const res = await fetch(`/api/saved-addresses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) await throwApiError(res, "Failed to update saved address");
  const json = await res.json();
  return json.data as SavedAddressRow;
}

async function deleteSavedAddressRequest(id: string): Promise<{ id: string }> {
  const res = await fetch(`/api/saved-addresses/${id}`, { method: "DELETE" });
  if (!res.ok) await throwApiError(res, "Failed to delete saved address");
  const json = await res.json();
  return json.data as { id: string };
}

export type SavedAddressMutations = {
  create: UseMutationResult<SavedAddressRow, Error, CreateSavedAddressInput>;
  update: UseMutationResult<SavedAddressRow, Error, { id: string; patch: UpdateSavedAddressInput }>;
  remove: UseMutationResult<{ id: string }, Error, string>;
};

/** CRUD mutations for saved addresses; each invalidates the list on success. */
export function useSavedAddressMutations(): SavedAddressMutations {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: createSavedAddressRequest,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateSavedAddressInput }) =>
      updateSavedAddressRequest(id, patch),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: deleteSavedAddressRequest,
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
