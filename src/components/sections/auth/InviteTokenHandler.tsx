"use client";

import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { getLocalePrefix } from "@/constants/app";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles Supabase invite tokens from the URL hash (server can't read fragments).
 * Exchanges the token for a session, then redirects to /auth/set-password.
 */
export function InviteTokenHandler({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=invite")) return;

    setProcessing(true);

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setProcessing(false);
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("[InviteTokenHandler] Failed to set session:", error.message);
          setProcessing(false);
          return;
        }

        // Full page navigation so middleware runs with fresh cookies
        const prefix = getLocalePrefix(locale, routing.defaultLocale);
        window.location.href = `${prefix}/auth/set-password`;
      });
  }, [supabase, locale]);

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary-200 border-t-primary-500 h-8 w-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  return <>{children}</>;
}
