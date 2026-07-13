import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // Nutzerspezifische Seiten (zusätzlich per Meta-Robots noindex)
          "/*/favorites",
          "/*/admin",
          "/*/loadouts/mine",
          "/*/loadouts/new",
          "/*/loadouts/*/edit",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
