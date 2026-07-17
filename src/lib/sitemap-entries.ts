import type { Db } from "mongodb";
import type { MetadataRoute } from "next";
import { findAllBlueprintRefs } from "@/features/blueprints/blueprints.repository";
import { findAllMaterials } from "@/features/blueprints/materials.repository";
import { listPublicGuideRefs } from "@/features/guides/guides.repository";
import {
  findAllStarSystemsCached,
  findBodiesBySystemCached,
} from "@/features/locations/locations.repository";
import { findAllOresCached } from "@/features/ores/ores.repository";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";

/** Alle statisch bekannten, indexierbaren Sektionen (Pfad ohne Locale). */
const STATIC_PATHS = [
  "",
  "/ores",
  "/locations",
  "/occurrences",
  "/signatures",
  "/compare",
  "/loadouts",
  "/companion",
  "/guides",
  "/ships",
  "/materials",
  "/blueprints",
] as const;

/** Pfad ohne Locale-Prefix → ein Sitemap-Eintrag pro Locale inkl. hreflang. */
function localizedEntries(
  path: string,
  priority: number,
  lastModified?: string,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    changeFrequency: "weekly",
    priority,
    // lastModified nur, wenn ein echter Datenstand existiert — nie faken
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  }));
}

/** DB-unabhängiger Teil — dient auch als Fallback ohne Datenbank. */
export function buildStaticEntries(): MetadataRoute.Sitemap {
  return [
    ...localizedEntries("", 1),
    ...STATIC_PATHS.slice(1).flatMap((path) => localizedEntries(path, 0.8)),
  ];
}

/** Zeitstempel des letzten Wiki-Syncs — Prune+Resync stempelt alles neu. */
async function findWikiSyncedAt(db: Db): Promise<string | undefined> {
  const meta = await db
    .collection("syncMeta")
    .findOne({ key: "scwiki" }, { projection: { syncedAt: 1 } });
  return typeof meta?.syncedAt === "string" ? meta.syncedAt : undefined;
}

/** Vollständige Sitemap: statische Sektionen + alle Entity-Detailseiten. */
export async function buildSitemapEntries(
  db: Db,
): Promise<MetadataRoute.Sitemap> {
  const [wikiSyncedAt, ores, systems, materials, blueprintRefs, guideRefs] =
    await Promise.all([
      findWikiSyncedAt(db),
      findAllOresCached(db),
      findAllStarSystemsCached(db),
      findAllMaterials(db),
      findAllBlueprintRefs(db),
      listPublicGuideRefs(db),
    ]);

  const entries: MetadataRoute.Sitemap = [...buildStaticEntries()];

  for (const ore of ores) {
    entries.push(
      ...localizedEntries(`/ores/${ore.code.toLowerCase()}`, 0.6, wikiSyncedAt),
    );
  }

  for (const system of systems) {
    const systemPath = `/locations/${system.code.toLowerCase()}`;
    entries.push(...localizedEntries(systemPath, 0.6, wikiSyncedAt));
    const bodies = await findBodiesBySystemCached(db, system.code);
    for (const body of bodies) {
      entries.push(
        ...localizedEntries(`${systemPath}/${body.slug}`, 0.6, wikiSyncedAt),
      );
    }
  }

  for (const material of materials) {
    entries.push(
      ...localizedEntries(
        `/materials/${material.code.toLowerCase()}`,
        0.5,
        material.syncedAt,
      ),
    );
  }

  for (const blueprint of blueprintRefs) {
    entries.push(
      ...localizedEntries(
        `/blueprints/${blueprint.slug}`,
        0.4,
        blueprint.syncedAt,
      ),
    );
  }

  for (const guide of guideRefs) {
    entries.push(
      ...localizedEntries(`/guides/${guide.id}`, 0.6, guide.updatedAt),
    );
  }

  return entries;
}
