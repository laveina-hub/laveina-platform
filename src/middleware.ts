import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { refreshSession, updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

const publicPaths = [
  "/",
  "/pricing",
  "/tracking",
  "/pickup-points",
  "/auth",
  "/how-it-works",
  "/why-choose",
  "/eco-partner",
  "/about",
  "/contact",
];
const authOnlyPaths = ["/auth/login", "/auth/register", "/auth/forgot-password"];
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

function isAuthOnlyPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  const locales = routing.locales as readonly string[];
  const pathWithoutLocale =
    segments.length > 0 && locales.includes(segments[0])
      ? "/" + segments.slice(1).join("/")
      : pathname;

  return authOnlyPaths.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
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

  const isPublic = isPublicPath(pathname);
  const isAuthOnly = isAuthOnlyPath(pathname);

  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const needsSupabase = hasSessionCookie && (isPublic || isAuthOnly);
  const refreshResult = needsSupabase ? await refreshSession(request) : null;
  const { user, getRole, supabaseResponse } =
    isPublic && !hasSessionCookie
      ? { user: null, getRole: async () => null, supabaseResponse: NextResponse.next({ request }) }
      : refreshResult
        ? {
            user: null,
            getRole: async () => null,
            supabaseResponse: refreshResult.supabaseResponse,
          }
        : await updateSession(request);

  const intlResponse = intlMiddleware(request);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });

  // Merge Supabase auth cookies into the intl response
  const overrideKey = "x-middleware-override-headers";
  const supabaseOverrides = supabaseResponse.headers.get(overrideKey);
  if (supabaseOverrides) {
    const existing = intlResponse.headers.get(overrideKey);
    const allHeaders = new Set([
      ...(existing ? existing.split(",") : []),
      ...supabaseOverrides.split(","),
    ]);
    intlResponse.headers.set(overrideKey, [...allHeaders].join(","));

    for (const header of supabaseOverrides.split(",")) {
      const value = supabaseResponse.headers.get(`x-middleware-request-${header}`);
      if (value !== null) {
        if (header === "cookie") {
          const intlValue = intlResponse.headers.get(`x-middleware-request-cookie`);
          if (intlValue && intlValue !== value) {
            const parseCookies = (str: string) =>
              new Map(
                str.split("; ").map((c) => {
                  const idx = c.indexOf("=");
                  return [c.substring(0, idx), c.substring(idx + 1)] as [string, string];
                })
              );
            const merged = parseCookies(intlValue);
            for (const [k, v] of parseCookies(value)) merged.set(k, v);
            intlResponse.headers.set(
              `x-middleware-request-cookie`,
              [...merged].map(([k, v]) => `${k}=${v}`).join("; ")
            );
            continue;
          }
        }
        intlResponse.headers.set(`x-middleware-request-${header}`, value);
      }
    }
  }

  if (isPublic) {
    return intlResponse;
  }

  // Redirect logged-in users away from auth pages
  if (isAuthOnly && refreshResult?.session) {
    const { data } = await refreshResult.supabase.rpc("get_user_role");
    const userRole = (data as string | null) ?? "customer";
    const dashboard =
      userRole === "admin" ? "/admin" : userRole === "pickup_point" ? "/pickup-point" : "/customer";
    const redirectUrl = new URL(dashboard, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && !isAuthOnlyPath(pathname)) {
    const segments = pathname.split("/").filter(Boolean);
    // SAFETY: widened for .includes() compatibility
    const locales = routing.locales as readonly string[];
    const locale =
      segments.length > 0 && locales.includes(segments[0]) ? segments[0] : routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRoles = getRequiredRole(pathname);
  if (requiredRoles) {
    const userRole = (await getRole()) ?? "customer";
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
