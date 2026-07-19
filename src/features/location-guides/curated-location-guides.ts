import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  locationAreaGuideSchema,
  locationGuideSchema,
  type LocationAreaGuide,
  type LocationGuide,
} from "./location-guides.schema";

const curatedFileSchema = z.object({
  _meta: z.object({
    generatedAt: z.string(),
    sources: z.array(z.string()),
    notes: z.string().optional(),
  }),
  guides: z.array(locationGuideSchema),
  areaGuides: z.array(locationAreaGuideSchema).default([]),
});

function loadCuratedFile() {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", "location-guides.json"),
    "utf-8",
  );
  return curatedFileSchema.parse(JSON.parse(raw));
}

/** Kuratierte Anreise-Hinweise pro Body (nur serverseitig nutzbar). */
export function loadCuratedLocationGuides(): LocationGuide[] {
  return loadCuratedFile().guides;
}

/** Kuratierte Flächen-Regeln (System + Body-Typ + Namensmuster). */
export function loadCuratedLocationAreaGuides(): LocationAreaGuide[] {
  return loadCuratedFile().areaGuides;
}
