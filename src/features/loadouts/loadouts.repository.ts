import type { Db, Filter, Document, Sort } from "mongodb";
import type { LoadoutMethod } from "./equipment.schema";
import {
  loadoutSchema,
  type Loadout,
  type LoadoutSort,
} from "./loadouts.schema";

const COLLECTION = "loadouts";
const NO_ID = { projection: { _id: 0 } } as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type PublicLoadoutQuery = {
  q?: string;
  method?: LoadoutMethod;
  vehicleCode?: string;
  sort: LoadoutSort;
  limit?: number;
};

export async function insertLoadout(db: Db, loadout: Loadout): Promise<void> {
  await db.collection(COLLECTION).insertOne({ ...loadout });
}

export async function findLoadoutById(
  db: Db,
  id: string,
): Promise<Loadout | null> {
  const doc = await db.collection(COLLECTION).findOne({ id }, NO_ID);
  return doc ? loadoutSchema.parse(doc) : null;
}

export async function replaceLoadout(db: Db, loadout: Loadout): Promise<void> {
  await db
    .collection(COLLECTION)
    .updateOne({ id: loadout.id }, { $set: loadout });
}

export async function deleteLoadoutById(db: Db, id: string): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ id });
}

export async function listPublicLoadouts(
  db: Db,
  query: PublicLoadoutQuery,
): Promise<Loadout[]> {
  const filter: Filter<Document> = { isPublic: true };
  if (query.method) filter.method = query.method;
  if (query.vehicleCode) filter.vehicleCode = query.vehicleCode;
  if (query.q?.trim()) {
    filter.name = { $regex: escapeRegex(query.q.trim()), $options: "i" };
  }

  const sort: Sort =
    query.sort === "top"
      ? { "votes.up": -1, createdAt: -1 }
      : { createdAt: -1 };

  let cursor = db.collection(COLLECTION).find(filter, NO_ID).sort(sort);
  if (query.limit) cursor = cursor.limit(query.limit);
  const docs = await cursor.toArray();
  return docs.map((doc) => loadoutSchema.parse(doc));
}

export async function countPublicLoadouts(db: Db): Promise<number> {
  return db.collection(COLLECTION).countDocuments({ isPublic: true });
}

export async function listLoadoutsByOwner(
  db: Db,
  userId: string,
): Promise<Loadout[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ ownerUserId: userId }, NO_ID)
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => loadoutSchema.parse(doc));
}
