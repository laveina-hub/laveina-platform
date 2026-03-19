"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

async function fetchPickupPointId(): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("pickup_points")
    .select("id")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  return data?.id ?? null;
}

export function usePickupPointId() {
  return useQuery({
    queryKey: ["pickup-point-id"],
    queryFn: fetchPickupPointId,
    staleTime: 5 * 60 * 1000,
  });
}
