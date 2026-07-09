import type { Db } from "mongodb";
import { favoriteSchema, type Favorite } from "./favorites.schema";

const COLLECTION = "favorites";
const NO_ID = { projection: { _id: 0 } } as const;

export async function addFavorite(
  db: Db,
  userId: string,
  systemCode: string,
  bodySlug: string,
): Promise<void> {
  const favorite = favoriteSchema.parse({
    userId,
    systemCode,
    bodySlug,
    createdAt: new Date().toISOString(),
  });

  await db
    .collection(COLLECTION)
    .updateOne(
      { userId, systemCode, bodySlug },
      { $setOnInsert: favorite },
      { upsert: true },
    );
}

export async function removeFavorite(
  db: Db,
  userId: string,
  systemCode: string,
  bodySlug: string,
): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ userId, systemCode, bodySlug });
}

export async function listFavorites(
  db: Db,
  userId: string,
): Promise<Favorite[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ userId }, NO_ID)
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => favoriteSchema.parse(doc));
}

export async function isFavorite(
  db: Db,
  userId: string,
  systemCode: string,
  bodySlug: string,
): Promise<boolean> {
  const doc = await db
    .collection(COLLECTION)
    .findOne({ userId, systemCode, bodySlug }, NO_ID);
  return doc !== null;
}
