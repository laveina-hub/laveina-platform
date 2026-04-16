import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            // SAFETY: options is typed as optional cookie options which are Record-shaped
            supabaseResponse.cookies.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => supabaseResponse };
}

/** Lightweight session check (3s timeout). */
export async function refreshSession(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  let session = null;
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (result) {
      session = result.data.session;
    }
  } catch {
    // Treat as unauthenticated
  }

  return { supabase, session, supabaseResponse: getResponse() };
}

/** Server-validated auth check (5s timeout). For protected pages. */
export async function updateSession(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request);

  let user: User | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (result) {
      user = result.data.user;
    }
  } catch {
    // Treat as unauthenticated
  }

  // Role from profiles table, not user_metadata (user-writable, untrusted)
  let cachedRole: string | null | undefined;
  async function getRole(): Promise<string | null> {
    if (cachedRole !== undefined) return cachedRole;
    if (!user) {
      cachedRole = null;
      return null;
    }
    const { data } = await supabase.rpc("get_user_role");
    // SAFETY: get_user_role RPC returns a text value or null
    cachedRole = (data as string | null) ?? "customer";
    return cachedRole;
  }

  return { user, getRole, supabaseResponse: getResponse() };
}

export type { User };
