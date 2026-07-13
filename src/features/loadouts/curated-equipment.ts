import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  miningGadgetSchema,
  miningLaserSchema,
  miningModuleSchema,
  miningVehicleSchema,
  type MiningGadget,
  type MiningLaser,
  type MiningModule,
  type MiningVehicle,
} from "./equipment.schema";

const metaSchema = z.object({
  patchVersion: z.string(),
  generatedAt: z.string(),
  sources: z.array(z.string()),
  notes: z.string().optional(),
  defaults: z.object({ patchVersion: z.string() }),
});

/**
 * Generischer Loader für die vier Equipment-Kataloge in data/curated/:
 * liest die Datei, merged die _meta-Defaults (patchVersion) in jede Zeile
 * und validiert gegen das jeweilige Zod-Schema (nur serverseitig nutzbar).
 */
function loadCurated<T>(
  fileName: string,
  key: string,
  schema: z.ZodType<T>,
): T[] {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", fileName),
    "utf-8",
  );
  const file = JSON.parse(raw) as Record<string, unknown>;
  const meta = metaSchema.parse(file._meta);
  const rows = z.array(z.record(z.string(), z.unknown())).parse(file[key]);

  return rows.map((entry) => schema.parse({ ...meta.defaults, ...entry }));
}

export function loadCuratedMiningVehicles(): MiningVehicle[] {
  return loadCurated("mining-vehicles.json", "vehicles", miningVehicleSchema);
}

export function loadCuratedMiningLasers(): MiningLaser[] {
  return loadCurated("mining-lasers.json", "lasers", miningLaserSchema);
}

export function loadCuratedMiningModules(): MiningModule[] {
  return loadCurated("mining-modules.json", "modules", miningModuleSchema);
}

export function loadCuratedMiningGadgets(): MiningGadget[] {
  return loadCurated("mining-gadgets.json", "gadgets", miningGadgetSchema);
}
