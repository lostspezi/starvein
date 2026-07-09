import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  oreOccurrenceSchema,
  type OreOccurrence,
} from "./ore-occurrences.schema";

const entrySchema = oreOccurrenceSchema.pick({
  oreCode: true,
  systemCode: true,
  bodySlug: true,
  method: true,
  probabilityPercent: true,
});

const fileSchema = z.object({
  _meta: z.object({
    patchVersion: z.string(),
    generatedAt: z.string(),
    sources: z.array(z.string()),
    notes: z.string().optional(),
    defaults: oreOccurrenceSchema.pick({
      patchVersion: true,
      sourceType: true,
      confidenceScore: true,
      lastVerifiedAt: true,
    }),
  }),
  occurrences: z.array(entrySchema),
});

/**
 * Liest data/curated/ore-occurrences.json und ergänzt jeden Eintrag um die
 * gemeinsamen Defaults aus _meta (patchVersion, sourceType, confidenceScore,
 * lastVerifiedAt).
 */
export function loadCuratedOccurrences(): OreOccurrence[] {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", "ore-occurrences.json"),
    "utf-8",
  );
  const file = fileSchema.parse(JSON.parse(raw));

  return file.occurrences.map((entry) =>
    oreOccurrenceSchema.parse({ ...file._meta.defaults, ...entry }),
  );
}
