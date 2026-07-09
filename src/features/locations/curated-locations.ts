import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  celestialBodySchema,
  starSystemSchema,
  type CelestialBody,
  type StarSystem,
} from "./locations.schema";

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

const bodiesFileSchema = z.object({
  _meta: metaSchema,
  celestialBodies: z.array(celestialBodySchema),
});

function readCurated(fileName: string): unknown {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", fileName),
    "utf-8",
  );
  return JSON.parse(raw);
}

export function loadCuratedStarSystems(): StarSystem[] {
  return systemsFileSchema.parse(readCurated("star-systems.json")).starSystems;
}

export function loadCuratedCelestialBodies(): CelestialBody[] {
  return bodiesFileSchema.parse(readCurated("celestial-bodies.json"))
    .celestialBodies;
}
