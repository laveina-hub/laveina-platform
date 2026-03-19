import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/", "/pricing", "/tracking", "/pickup-points", "/auth"];
const rolePaths: Record<string, string[]> = {
  "/admin": ["admin"],
  "/pickup-point": ["pickup_point", "admin"],
  "/customer": ["customer", "admin"],
};

function isPublicPath(pathname: string): boolean {
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

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const { user, role, supabaseResponse } = await updateSession(request);
  const intlResponse = intlMiddleware(request);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  if (!user) {
    // Preserve the locale prefix so next-intl keeps the user in the same locale.
    const segments = pathname.split("/").filter(Boolean);
    const locales = routing.locales as readonly string[];
    const locale =
      segments.length > 0 && locales.includes(segments[0]) ? segments[0] : routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRoles = getRequiredRole(pathname);
  if (requiredRoles) {
    const userRole = role ?? "customer";
    if (!requiredRoles.includes(userRole)) {
      const defaultPath =
        userRole === "admin"
          ? "/admin"
          : userRole === "pickup_point"
            ? "/pickup-point"
            : "/customer";
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
