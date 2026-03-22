import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "./server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type AuthSuccess = {
  supabase: SupabaseClient;
  user: User;
  role: string;
  error?: never;
};

type AuthFailure = {
  error: NextResponse;
  supabase?: never;
  user?: never;
  role?: never;
};

type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authenticates the current request and fetches the user's role.
 *
 * Returns `{ supabase, user, role }` on success, or `{ error: NextResponse }` on failure.
 *
 * Usage:
 * ```ts
 * const auth = await verifyAuth();
 * if (auth.error) return auth.error;
 * const { supabase, user, role } = auth;
 * ```
 */
export async function verifyAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user, role: profile.role };
}
