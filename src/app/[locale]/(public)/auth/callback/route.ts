import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/env";
import { routing } from "@/i18n/routing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const origin = env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const localePrefix =
    locale && (routing.locales as readonly string[]).includes(locale) ? `/${locale}` : "";

  const redirectPath = next.startsWith(localePrefix) ? next : `${localePrefix}${next}`;
  const successUrl = `${origin}${redirectPath}`;

  if (code) {
    const response = NextResponse.redirect(successUrl);

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

    // Code may already be used — check for existing session
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}${localePrefix}/auth/login?error=callback_failed`);
}
