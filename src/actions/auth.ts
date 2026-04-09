"use server";

import { redirect } from "next/navigation";

import { getLocalePrefix, ROLE_DASHBOARD } from "@/constants/app";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

type LoginResult = {
  error: string;
};

/** Server action for login. Only returns on error — success always redirects. */
export async function loginAction(
  email: string,
  password: string,
  locale: string,
  redirectTo?: string | null
): Promise<LoginResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "invalidCredentials" };
  }

  const { data: role } = await supabase.rpc("get_user_role");
  // SAFETY: RPC returns text from DB enum
  const userRole = (role as string) ?? "customer";

  // Prevent open-redirect
  const hasValidRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//");
  let dashboardPath = hasValidRedirect ? redirectTo : (ROLE_DASHBOARD[userRole] ?? "/customer");

  // Strip existing locale prefix to avoid double-prefixing
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(/|$)`);
  dashboardPath = dashboardPath.replace(localePattern, "$2") || "/";
  if (!dashboardPath.startsWith("/")) dashboardPath = `/${dashboardPath}`;

  const prefix = getLocalePrefix(locale, routing.defaultLocale);

  // redirect() throws — must be outside try-catch
  redirect(`${prefix}${dashboardPath}`);
}
