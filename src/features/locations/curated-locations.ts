import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { starSystemSchema, type StarSystem } from "./locations.schema";

const metaSchema = z.object({
  patchVersion: z.string(),
  generatedAt: z.string(),
  sources: z.array(z.string()),
  notes: z.string().optional(),
});

const systemsFileSchema = z.object({
  _meta: metaSchema,
  starSystems: z.array(starSystemSchema),
});

/**
 * Sternsysteme bleiben kuratiert (winziges Mapping, definiert die für den
 * Wiki-Sync bekannten Systeme). Die Bodies kommen aus syncWikiLocations.
 */
export function loadCuratedStarSystems(): StarSystem[] {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", "star-systems.json"),
    "utf-8",
  );
  return systemsFileSchema.parse(JSON.parse(raw)).starSystems;
}
