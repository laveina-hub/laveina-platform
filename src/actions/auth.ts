"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getLocalePrefix, ROLE_DASHBOARD } from "@/constants/app";
import { env } from "@/env";
import { routing } from "@/i18n/routing";
import { authLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const RECOVERY_EMAIL_COOKIE = "recovery_email";
const RECOVERY_EMAIL_MAX_AGE = 600; // 10 minutes

/** Extracts the client IP from incoming request headers available in server actions. */
async function getActionClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerStore.get("x-real-ip") ?? "unknown";
}

type LoginResult = {
  error: string;
};

type ActionResult = {
  error?: string;
  success?: boolean;
};

/**
 * Send a password-reset OTP via Supabase (server-side so PKCE code_verifier
 * is persisted in cookies, not localStorage).
 */
export async function sendPasswordResetOtp(email: string): Promise<ActionResult> {
  const ip = await getActionClientIp();
  const rl = authLimiter.check(ip);
  if (!rl.success) return { error: "tooManyRequests" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return { error: "resetFailed" };
  }

  // Store email in httpOnly cookie so it never appears in the URL
  const cookieStore = await cookies();
  cookieStore.set(RECOVERY_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: RECOVERY_EMAIL_MAX_AGE,
    path: "/",
  });

  return { success: true };
}

/** Read the recovery email from the httpOnly cookie (server-side only). */
export async function getRecoveryEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(RECOVERY_EMAIL_COOKIE)?.value ?? null;
}

/**
 * Verify a 6-digit recovery OTP (server-side so the PKCE code_verifier
 * stored in cookies is automatically included).
 */
export async function verifyPasswordResetOtp(token: string): Promise<ActionResult> {
  const cookieStore = await cookies();
  const email = cookieStore.get(RECOVERY_EMAIL_COOKIE)?.value;

  if (!email) {
    return { error: "missing_email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (error) {
    return { error: "invalidOtp" };
  }

  // Clean up — email no longer needed after successful verification
  cookieStore.delete(RECOVERY_EMAIL_COOKIE);

  return { success: true };
}

/**
 * Update the user's password (server-side so the recovery session in cookies
 * is used directly). Signs out afterwards for reset mode.
 */
export async function updatePasswordAction(
  password: string,
  mode: "reset" | "set"
): Promise<ActionResult & { role?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "updateFailed" };
  }

  if (mode === "reset") {
    await supabase.auth.signOut();
    return { success: true };
  }

  // For "set" mode (invited users), return the role so the client can redirect
  const { data: role } = await supabase.rpc("get_user_role");
  // SAFETY: RPC returns text from DB enum
  return { success: true, role: (role as string) ?? "pickup_point" };
}

/**
 * Register a new user (server-side so password never touches client-side auth).
 * Returns generic errors to prevent email enumeration.
 */
export async function registerAction(
  email: string,
  password: string,
  fullName: string,
  locale: string
): Promise<ActionResult> {
  const ip = await getActionClientIp();
  const rl = authLimiter.check(ip);
  if (!rl.success) return { error: "tooManyRequests" };

  const supabase = await createClient();
  const origin = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const emailRedirectTo = `${origin}/${locale}/auth/callback?next=/auth/account-created`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: "registrationFailed" };
  }

  // Don't reveal whether the email already exists — always show success.
  // Supabase returns a user with empty identities if the email is taken,
  // but we treat it the same as a successful signup to prevent enumeration.
  return { success: true };
}

/** Only returns on error — success always redirects. */
export async function loginAction(
  email: string,
  password: string,
  locale: string,
  redirectTo?: string | null
): Promise<LoginResult> {
  const ip = await getActionClientIp();
  const rl = authLimiter.check(ip);
  if (!rl.success) return { error: "tooManyRequests" };

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "invalidCredentials" };
  }

  const { data: role } = await supabase.rpc("get_user_role");
  // SAFETY: RPC returns text from DB enum
  const userRole = (role as string) ?? "customer";

  const hasValidRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//");
  let dashboardPath = hasValidRedirect ? redirectTo : (ROLE_DASHBOARD[userRole] ?? "/customer");

  // Avoid double-prefixing locale
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(/|$)`);
  dashboardPath = dashboardPath.replace(localePattern, "$2") || "/";
  if (!dashboardPath.startsWith("/")) dashboardPath = `/${dashboardPath}`;

  const prefix = getLocalePrefix(locale, routing.defaultLocale);

  // redirect() throws — must be outside try-catch
  redirect(`${prefix}${dashboardPath}`);
}
