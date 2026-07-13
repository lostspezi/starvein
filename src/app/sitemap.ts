import type { MetadataRoute } from "next";
import { findAllOres } from "@/features/ores/ores.repository";
import {
  findAllStarSystems,
  findBodiesBySystem,
} from "@/features/locations/locations.repository";
import { routing } from "@/i18n/routing";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Pfad ohne Locale-Prefix → ein Sitemap-Eintrag pro Locale inkl. hreflang. */
function localizedEntries(
  path: string,
  priority: number,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    changeFrequency: "weekly",
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/ores",
    "/locations",
    "/signatures",
    "/compare",
    "/loadouts",
  ];

  const dynamicPaths: string[] = [];
  try {
    const db = await getDb();
    const [ores, systems] = await Promise.all([
      findAllOres(db),
      findAllStarSystems(db),
    ]);

    dynamicPaths.push(...ores.map((ore) => `/ores/${ore.code.toLowerCase()}`));

    for (const system of systems) {
      const systemPath = `/locations/${system.code.toLowerCase()}`;
      dynamicPaths.push(systemPath);
      const bodies = await findBodiesBySystem(db, system.code);
      dynamicPaths.push(...bodies.map((body) => `${systemPath}/${body.slug}`));
    }
  } catch {
    // DB nicht erreichbar: statische Routen reichen als Fallback
  }

  return [
    ...localizedEntries("", 1),
    ...staticPaths.slice(1).flatMap((path) => localizedEntries(path, 0.8)),
    ...dynamicPaths.flatMap((path) => localizedEntries(path, 0.6)),
  ];
}
