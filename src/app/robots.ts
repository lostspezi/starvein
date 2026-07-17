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
          "/*/warehouse",
          "/*/inventory",
          "/*/refinery-jobs",
          "/*/device",
          "/*/loadouts/mine",
          "/*/loadouts/new",
          "/*/loadouts/*/edit",
          "/*/guides/mine",
          "/*/guides/new",
          "/*/guides/*/edit",
          "/*/blueprints/craftable",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
