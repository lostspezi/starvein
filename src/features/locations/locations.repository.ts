import type { Db } from "mongodb";
import {
  celestialBodySchema,
  starSystemSchema,
  type CelestialBody,
  type StarSystem,
} from "./locations.schema";

const SYSTEMS = "starSystems";
const BODIES = "celestialBodies";

const NO_ID = { projection: { _id: 0 } } as const;

export async function findAllStarSystems(db: Db): Promise<StarSystem[]> {
  const docs = await db
    .collection(SYSTEMS)
    .find({}, NO_ID)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => starSystemSchema.parse(doc));
}

export async function findStarSystemByCode(
  db: Db,
  code: string,
): Promise<StarSystem | null> {
  const doc = await db.collection(SYSTEMS).findOne({ code }, NO_ID);
  return doc ? starSystemSchema.parse(doc) : null;
}

export async function findBodiesBySystem(
  db: Db,
  systemCode: string,
): Promise<CelestialBody[]> {
  const docs = await db
    .collection(BODIES)
    .find({ systemCode }, NO_ID)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => celestialBodySchema.parse(doc));
}

export async function findAllCelestialBodies(db: Db): Promise<CelestialBody[]> {
  const docs = await db
    .collection(BODIES)
    .find({}, NO_ID)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => celestialBodySchema.parse(doc));
}

export async function findBodyBySlug(
  db: Db,
  systemCode: string,
  slug: string,
): Promise<CelestialBody | null> {
  const doc = await db.collection(BODIES).findOne({ systemCode, slug }, NO_ID);
  return doc ? celestialBodySchema.parse(doc) : null;
}

export async function findChildBodies(
  db: Db,
  systemCode: string,
  parentSlug: string,
): Promise<CelestialBody[]> {
  const docs = await db
    .collection(BODIES)
    .find({ systemCode, parentSlug }, NO_ID)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => celestialBodySchema.parse(doc));
}

export async function countCelestialBodies(db: Db): Promise<number> {
  return db.collection(BODIES).countDocuments();
}

export async function upsertStarSystems(
  db: Db,
  systems: StarSystem[],
): Promise<void> {
  if (systems.length === 0) return;
  await db.collection(SYSTEMS).bulkWrite(
    systems.map((system) => ({
      updateOne: {
        filter: { code: system.code },
        update: { $set: system },
        upsert: true,
      },
    })),
  );
}

export async function upsertCelestialBodies(
  db: Db,
  bodies: CelestialBody[],
): Promise<void> {
  if (bodies.length === 0) return;
  await db.collection(BODIES).bulkWrite(
    bodies.map((body) => ({
      updateOne: {
        filter: { systemCode: body.systemCode, slug: body.slug },
        update: { $set: body },
        upsert: true,
      },
    })),
  );
}
