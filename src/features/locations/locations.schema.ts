import { z } from "zod";

export const SYSTEM_STATUS = ["live", "ptu"] as const;

export const BODY_TYPES = [
  "planet",
  "moon",
  "lagrangePoint",
  "spaceStation",
  "outpost",
  "asteroidBelt",
  "cave",
] as const;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const starSystemSchema = z.object({
  code: z.string().regex(/^[A-Z]+$/),
  name: z.string().min(1),
  status: z.enum(SYSTEM_STATUS),
  // Mapping für den späteren UEX-Sync (CLAUDE.md §5: uexLocationId)
  uexId: z.number().int().positive(),
});

export const celestialBodySchema = z.object({
  slug,
  systemCode: starSystemSchema.shape.code,
  type: z.enum(BODY_TYPES),
  name: z.string().min(1),
  parentSlug: slug.nullable(),
  uexId: z.number().int().positive(),
});

export type StarSystem = z.infer<typeof starSystemSchema>;
export type CelestialBody = z.infer<typeof celestialBodySchema>;
export type BodyType = (typeof BODY_TYPES)[number];
