import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";
const isLocalProd = !isDev && process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://localhost");

const cspDirectives = [
  "default-src 'self'",
  // unsafe-eval required by Crisp Chat SDK
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://client.crisp.chat https://*.iubenda.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://client.crisp.chat https://*.iubenda.com https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://image.crisp.chat https://client.crisp.chat https://*.iubenda.com https://maps.gstatic.com https://maps.googleapis.com https://*.ggpht.com",
  "font-src 'self' data: https://client.crisp.chat https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://server.gallabox.com https://client.crisp.chat wss://client.relay.crisp.chat https://storage.crisp.chat https://*.iubenda.com https://maps.googleapis.com https://places.googleapis.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://game.crisp.chat https://*.iubenda.com https://maps.googleapis.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Breaks localhost (forces http→https)
  ...(isDev || isLocalProd ? [] : ["upgrade-insecure-requests"]),
];

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // max-age=0 in dev clears any cached HSTS for localhost
  {
    key: "Strict-Transport-Security",
    value: isDev ? "max-age=0" : "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // geolocation=(self): allow the app itself to request location for Q6.3
    // "Use my location" on the booking flow. `camera=(self)` keeps the QR
    // scanner path open. Everything else stays denied for defense-in-depth.
    value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
