import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  signatureProfileSchema,
  type SignatureProfile,
} from "./signature-profiles.schema";

const shipEntrySchema = z.object({
  oreCode: z.string(),
  signatureValue: z.number(),
  dominantCompositionRange: z.object({ min: z.number(), max: z.number() }),
  notes: z.string().optional(),
});

const fileSchema = z.object({
  _meta: z.object({
    patchVersion: z.string(),
    generatedAt: z.string(),
    sources: z.array(z.string()),
    notes: z.string().optional(),
    defaults: z.object({
      patchVersion: z.string(),
      sourceType: z.enum(["curated", "community"]),
      confidenceScore: z.number(),
    }),
  }),
  shipProfiles: z.array(shipEntrySchema),
  groundMinerals: z.array(z.string()),
  groundSignatures: z.object({ fps: z.number(), roc: z.number() }),
});

/**
 * Liest data/curated/signature-profiles.json: Ship-Profile stehen explizit
 * drin, die ROC/FPS-Profile werden aus groundMinerals × groundSignatures
 * expandiert (alle Ground-Deposits teilen sich die größenbasierte Signatur).
 */
export function loadCuratedSignatureProfiles(): SignatureProfile[] {
  const raw = readFileSync(
    join(process.cwd(), "data", "curated", "signature-profiles.json"),
    "utf-8",
  );
  const file = fileSchema.parse(JSON.parse(raw));
  const { defaults } = file._meta;

  const ship = file.shipProfiles.map((entry) =>
    signatureProfileSchema.parse({ ...defaults, ...entry, method: "ship" }),
  );

  const ground = file.groundMinerals.flatMap((oreCode) =>
    (["fps", "roc"] as const).map((method) =>
      signatureProfileSchema.parse({
        ...defaults,
        oreCode,
        method,
        signatureValue: file.groundSignatures[method],
      }),
    ),
  );

  return [...ship, ...ground];
}
