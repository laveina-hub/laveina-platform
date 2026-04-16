import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { routing } from "@/i18n/routing";

/** Allowed redirect paths after auth callback — prevents open redirect attacks */
const ALLOWED_NEXT_PATHS = [
  "/auth/account-created",
  "/auth/reset-password",
  "/admin",
  "/customer",
  "/pickup-point",
  "/",
];

function isAllowedRedirect(path: string): boolean {
  return ALLOWED_NEXT_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const origin = env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";

  // Prevent open redirect — only allow internal paths
  const next = isAllowedRedirect(rawNext) ? rawNext : "/";

  // SAFETY: locales is a readonly tuple, widen to readonly string[] for includes() check
  const localePrefix =
    locale && (routing.locales as readonly string[]).includes(locale) ? `/${locale}` : "";

  const redirectPath = next.startsWith(localePrefix) ? next : `${localePrefix}${next}`;
  const isSignupConfirmation = next === "/auth/account-created";

  if (code) {
    const redirectUrl = new URL(`${origin}${redirectPath}`);
    if (isSignupConfirmation) {
      redirectUrl.searchParams.set("confirmed", "true");
    }

    const response = NextResponse.redirect(redirectUrl.toString());

    // For signup confirmation: exchange code without setting browser cookies.
    // The email gets verified but no session is created — user must log in explicitly.
    if (isSignupConfirmation) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Exchange the code server-side to confirm the email
      // We use a throwaway server client just for the exchange — cookies go nowhere
      const throwawayClient = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            // Intentionally discard cookies — we don't want a browser session
            setAll() {},
          },
        }
      );

      const { error } = await throwawayClient.auth.exchangeCodeForSession(code);
      if (!error) {
        // Exchange succeeded → email is confirmed. Sign out the throwaway session.
        // No cookies were set, so the browser has no session.
        return response;
      }

      // If exchange failed, the email might already be confirmed
      const { data } = await supabaseAdmin.auth.admin.getUserById("");
      if (data.user) {
        return response;
      }

      console.error("[auth/callback] Signup confirmation failed:", error.message);
      return NextResponse.redirect(`${origin}${localePrefix}/auth/login?error=callback_failed`);
    }

    // For all other flows (OAuth, password reset): normal session-based exchange
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
          ) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as Record<string, unknown>);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    console.error("[auth/callback] Code exchange failed:", error.message);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}${localePrefix}/auth/login?error=callback_failed`);
}
