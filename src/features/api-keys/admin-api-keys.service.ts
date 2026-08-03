import { ObjectId, type Db } from "mongodb";

const API_KEY_COLLECTION = "apikey";
const USER_COLLECTION = "user";
const USAGE_COLLECTION = "apiUsage";

export type AdminApiKeyEntry = {
  id: string;
  name: string;
  start: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Summe aller aggregierten Requests (30-Tage-Retention). */
  totalRequests: number;
  owner: { id: string; name: string; banned: boolean };
};

/**
 * Alle Keys für die Admin-Übersicht: Owner-Name, Ban-Status und
 * Request-Summen aus der apiUsage-Aggregation — niemals Key-Material
 * (nur das start-Fragment).
 */
export async function listAllKeysWithOwners(
  db: Db,
  limit = 500,
): Promise<AdminApiKeyEntry[]> {
  const keys = await db
    .collection(API_KEY_COLLECTION)
    .find(
      {},
      {
        projection: {
          name: 1,
          start: 1,
          referenceId: 1,
          createdAt: 1,
          lastRequest: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const ownerIds = [
    ...new Set(keys.map((key) => String(key.referenceId))),
  ].filter(ObjectId.isValid);
  const users = await db
    .collection(USER_COLLECTION)
    .find(
      { _id: { $in: ownerIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, apiKeysBanned: 1 } },
    )
    .toArray();
  const usersById = new Map(
    users.map((user) => [
      user._id.toHexString(),
      {
        name: String(user.name ?? ""),
        banned: user.apiKeysBanned === true,
      },
    ]),
  );

  const totals = await db
    .collection(USAGE_COLLECTION)
    .aggregate<{ _id: string; total: number }>([
      { $group: { _id: "$keyId", total: { $sum: "$total" } } },
    ])
    .toArray();
  const totalsByKey = new Map(totals.map((row) => [row._id, row.total]));

  return keys.map((key) => {
    const ownerId = String(key.referenceId);
    const owner = usersById.get(ownerId);
    return {
      id: key._id.toHexString(),
      name: String(key.name ?? ""),
      start: String(key.start ?? ""),
      createdAt: new Date(key.createdAt as Date | string).toISOString(),
      lastUsedAt: key.lastRequest
        ? new Date(key.lastRequest as Date | string).toISOString()
        : null,
      totalRequests: totalsByKey.get(key._id.toHexString()) ?? 0,
      owner: {
        id: ownerId,
        name: owner?.name ?? "",
        banned: owner?.banned ?? false,
      },
    };
  });
}

/** Löscht einen Key ohne Ownership-Bindung (Admin-Aktion). */
export async function adminRevokeKey(db: Db, keyId: string): Promise<boolean> {
  if (!ObjectId.isValid(keyId)) return false;
  const result = await db
    .collection(API_KEY_COLLECTION)
    .deleteOne({ _id: new ObjectId(keyId) });
  return result.deletedCount === 1;
}

/**
 * Sperrt/entsperrt das Erstellen neuer Keys für einen Nutzer.
 * Bestehende Keys bleiben unberührt (dafür gibt es adminRevokeKey).
 */
export async function setApiKeyBan(
  db: Db,
  userId: string,
  banned: boolean,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const result = await db
    .collection(USER_COLLECTION)
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { apiKeysBanned: banned, updatedAt: new Date() } },
    );
  return result.matchedCount === 1;
}

export async function isApiKeyBanned(db: Db, userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const doc = await db
    .collection(USER_COLLECTION)
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { apiKeysBanned: 1 } },
    );
  return doc?.apiKeysBanned === true;
}
