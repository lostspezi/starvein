import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { buildSitemapEntries, buildStaticEntries } from "@/lib/sitemap-entries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await buildSitemapEntries(await getDb());
  } catch {
    // DB nicht erreichbar: statische Routen reichen als Fallback
    return buildStaticEntries();
  }
}
