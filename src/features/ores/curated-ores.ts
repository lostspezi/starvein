import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { oreSchema, type Ore } from "./ores.schema";

const curatedFileSchema = z.object({
  _meta: z.object({
    patchVersion: z.string(),
    generatedAt: z.string(),
    sources: z.array(z.string()),
    notes: z.string().optional(),
  }),
  ores: z.array(oreSchema),
});

/** Liest und validiert data/curated/ores.json (nur serverseitig nutzbar). */
export function loadCuratedOres(): Ore[] {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", "ores.json"),
    "utf-8",
  );
  return curatedFileSchema.parse(JSON.parse(raw)).ores;
}
