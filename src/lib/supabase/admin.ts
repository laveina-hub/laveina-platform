import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Admin Supabase client with service_role key.
 * Bypasses Row Level Security — use only in server-side code
 * (API routes, webhooks, background jobs).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
