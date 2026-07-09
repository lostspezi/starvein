import type { Db } from "mongodb";
import {
  celestialBodySchema,
  starSystemSchema,
} from "@/features/locations/locations.schema";
import { oreSchema } from "@/features/ores/ores.schema";

export type SearchResult = {
  kind: "ore" | "system" | "body";
  /** Anzeigename */
  label: string;
  /**
   * Kontext für die Sublabel-Anzeige: rarityTier bei Erzen,
   * Body-Typ bei Himmelskörpern, "system" bei Systemen.
   */
  detail: string;
  href: string;
};

const DEFAULT_LIMIT = 8;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchAll(
  db: Db,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const contains = new RegExp(escapeRegex(trimmed), "i");
  const noId = { projection: { _id: 0 } } as const;

  const [oreDocs, systemDocs, bodyDocs] = await Promise.all([
    db
      .collection("ores")
      .find(
        {
          $or: [
            { name_en: contains },
            { name_de: contains },
            { code: contains },
          ],
        },
        noId,
      )
      .sort({ name_en: 1 })
      .limit(limit)
      .toArray(),
    db
      .collection("starSystems")
      .find({ $or: [{ name: contains }, { code: contains }] }, noId)
      .sort({ name: 1 })
      .limit(limit)
      .toArray(),
    db
      .collection("celestialBodies")
      .find({ name: contains }, noId)
      .sort({ name: 1 })
      .limit(limit)
      .toArray(),
  ]);

  const results: SearchResult[] = [
    ...systemDocs.map((doc) => {
      const system = starSystemSchema.parse(doc);
      return {
        kind: "system" as const,
        label: system.name,
        detail: "system",
        href: `/locations/${system.code.toLowerCase()}`,
      };
    }),
    ...bodyDocs.map((doc) => {
      const body = celestialBodySchema.parse(doc);
      return {
        kind: "body" as const,
        label: body.name,
        detail: body.type,
        href: `/locations/${body.systemCode.toLowerCase()}/${body.slug}`,
      };
    }),
    ...oreDocs.map((doc) => {
      const ore = oreSchema.parse(doc);
      return {
        kind: "ore" as const,
        label: ore.name_en,
        detail: ore.rarityTier,
        href: `/ores#${ore.code}`,
      };
    }),
  ];

  // Treffer am Wortanfang vor reinen Substring-Treffern, dann alphabetisch
  const startsWith = new RegExp(`^${escapeRegex(trimmed)}`, "i");
  results.sort((a, b) => {
    const aPrefix = startsWith.test(a.label) ? 0 : 1;
    const bPrefix = startsWith.test(b.label) ? 0 : 1;
    return aPrefix - bPrefix || a.label.localeCompare(b.label);
  });

  return results.slice(0, limit);
}
