import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Routes that don't need auth
const publicPaths = ["/", "/pricing", "/tracking", "/pickup-points", "/auth"];
// Routes that need specific roles
const rolePaths: Record<string, string[]> = {
  "/admin": ["admin"],
  "/pickup-point": ["pickup_point", "admin"],
  "/customer": ["customer", "admin"],
};

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix if present
  const segments = pathname.split("/").filter(Boolean);
  const locales = routing.locales as readonly string[];
  const pathWithoutLocale =
    segments.length > 0 && locales.includes(segments[0])
      ? "/" + segments.slice(1).join("/")
      : pathname;

  if (pathWithoutLocale === "/") return true;
  return publicPaths.some(
    (p) => p !== "/" && (pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/"))
  );
}

function getRequiredRole(pathname: string): string[] | null {
  const segments = pathname.split("/").filter(Boolean);
  const locales = routing.locales as readonly string[];
  const pathWithoutLocale =
    segments.length > 0 && locales.includes(segments[0])
      ? "/" + segments.slice(1).join("/")
      : pathname;

  for (const [prefix, roles] of Object.entries(rolePaths)) {
    if (pathWithoutLocale === prefix || pathWithoutLocale.startsWith(prefix + "/")) {
      return roles;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Refresh Supabase session
  const { user, supabaseResponse } = await updateSession(request);

  // Run intl middleware to handle locale
  const intlResponse = intlMiddleware(request);

  // Copy Supabase cookies to the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  // Public paths — no auth needed
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // Protected paths — redirect to login if not authenticated
  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role check — user metadata should contain role
  const requiredRoles = getRequiredRole(pathname);
  if (requiredRoles) {
    const userRole = user.user_metadata?.role as string | undefined;
    if (!userRole || !requiredRoles.includes(userRole)) {
      // Redirect to their correct dashboard
      const defaultPath =
        userRole === "admin" ? "/admin" : userRole === "pickup_point" ? "/pickup-point" : "/customer";
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
