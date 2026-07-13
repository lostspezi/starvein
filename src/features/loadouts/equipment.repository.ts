import type { Db } from "mongodb";
import type { EquipmentCatalog } from "./compatibility";
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

const NO_ID = { projection: { _id: 0 } } as const;

const VEHICLES = "miningVehicles";
const LASERS = "miningLasers";
const MODULES = "miningModules";
const GADGETS = "miningGadgets";

async function upsertByCode(
  db: Db,
  collection: string,
  rows: { code: string }[],
): Promise<void> {
  if (rows.length === 0) return;

  await db.collection(collection).bulkWrite(
    rows.map((row) => ({
      updateOne: {
        filter: { code: row.code },
        update: { $set: row },
        upsert: true,
      },
    })),
  );
}

export async function upsertMiningVehicles(
  db: Db,
  vehicles: MiningVehicle[],
): Promise<void> {
  await upsertByCode(db, VEHICLES, vehicles);
}

export async function upsertMiningLasers(
  db: Db,
  lasers: MiningLaser[],
): Promise<void> {
  await upsertByCode(db, LASERS, lasers);
}

export async function upsertMiningModules(
  db: Db,
  modules: MiningModule[],
): Promise<void> {
  await upsertByCode(db, MODULES, modules);
}

export async function upsertMiningGadgets(
  db: Db,
  gadgets: MiningGadget[],
): Promise<void> {
  await upsertByCode(db, GADGETS, gadgets);
}

export async function findAllMiningVehicles(db: Db): Promise<MiningVehicle[]> {
  const docs = await db
    .collection(VEHICLES)
    .find({}, NO_ID)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => miningVehicleSchema.parse(doc));
}

export async function findVehicleByCode(
  db: Db,
  code: string,
): Promise<MiningVehicle | null> {
  const doc = await db.collection(VEHICLES).findOne({ code }, NO_ID);
  return doc ? miningVehicleSchema.parse(doc) : null;
}

export async function findAllMiningLasers(db: Db): Promise<MiningLaser[]> {
  const docs = await db
    .collection(LASERS)
    .find({}, NO_ID)
    .sort({ size: 1, name: 1 })
    .toArray();
  return docs.map((doc) => miningLaserSchema.parse(doc));
}

export async function findAllMiningModules(db: Db): Promise<MiningModule[]> {
  const docs = await db
    .collection(MODULES)
    .find({}, NO_ID)
    .sort({ type: 1, name: 1 })
    .toArray();
  return docs.map((doc) => miningModuleSchema.parse(doc));
}

export async function findAllMiningGadgets(db: Db): Promise<MiningGadget[]> {
  const docs = await db
    .collection(GADGETS)
    .find({}, NO_ID)
    .sort({ name: 1 })
    .toArray();
  return docs.map((doc) => miningGadgetSchema.parse(doc));
}

/** Gesamter Equipment-Katalog für Validierung und Builder-Props. */
export async function loadEquipmentCatalog(db: Db): Promise<EquipmentCatalog> {
  const [vehicles, lasers, modules, gadgets] = await Promise.all([
    findAllMiningVehicles(db),
    findAllMiningLasers(db),
    findAllMiningModules(db),
    findAllMiningGadgets(db),
  ]);
  return { vehicles, lasers, modules, gadgets };
}
