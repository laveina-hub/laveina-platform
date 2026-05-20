import type { MetadataRoute } from "next";

import { env } from "@/env";

const BASE_URL = env.NEXT_PUBLIC_APP_URL ?? "https://laveina.co";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/customer/", "/pickup-point/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
