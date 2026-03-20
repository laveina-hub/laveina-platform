import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://laveina.co";

const publicRoutes = [
  "/",
  "/pricing",
  "/tracking",
  "/pickup-points",
  "/book",
  "/auth/login",
  "/auth/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of publicRoutes) {
    const alternates: Record<string, string> = {};

    for (const locale of routing.locales) {
      const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
      alternates[locale] = `${BASE_URL}${prefix}${route === "/" ? "" : route}`;
    }

    // Use the default locale URL as the primary
    const defaultPrefix = "";
    const url = `${BASE_URL}${defaultPrefix}${route === "/" ? "" : route}`;

    entries.push({
      url,
      lastModified: new Date(),
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1.0 : 0.8,
      alternates: { languages: alternates },
    });
  }

  return entries;
}
