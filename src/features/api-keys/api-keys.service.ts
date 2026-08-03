import { ObjectId, type Db } from "mongodb";
import { auth } from "@/lib/auth";
import type { ApiKeySummary, CreatedApiKey } from "./api-keys.schema";

/**
 * Collection des Better-Auth-apiKey-Plugins. Feldnamen (referenceId als
 * String, _id als ObjectId, key nur gehasht) sind durch den
 * Adapter-Tripwire-Test (api-key-adapter.integration.test.ts) abgesichert.
 */
const API_KEY_COLLECTION = "apikey";

/** Nutzer hat bereits MAX_API_KEYS_PER_USER aktive Keys. */
export class KeyLimitError extends Error {
  constructor() {
    super("key limit reached");
    this.name = "KeyLimitError";
  }
}

type ApiKeyDoc = {
  _id: ObjectId;
  name?: string | null;
  start?: string | null;
  referenceId: string;
  createdAt: Date | string;
  lastRequest?: Date | string | null;
};

function toSummary(doc: ApiKeyDoc): ApiKeySummary {
  return {
    id: doc._id.toHexString(),
    name: doc.name ?? "",
    start: doc.start ?? "",
    createdAt: new Date(doc.createdAt).toISOString(),
    lastUsedAt: doc.lastRequest
      ? new Date(doc.lastRequest).toISOString()
      : null,
  };
}

/**
 * Erstellt einen Key über das Plugin (Hashing, Prefix, start-Spalte).
 * Das Key-Limit erzwingt der globale before-Hook (apiKeyCapHook) —
 * hier wird sein FORBIDDEN nur auf KeyLimitError gemappt.
 */
export async function createKey(
  _db: Db,
  userId: string,
  name: string,
): Promise<CreatedApiKey> {
  try {
    const created = await auth.api.createApiKey({
      body: { name, userId },
    });
    return {
      id: created.id,
      name: created.name ?? name,
      start: created.start ?? "",
      createdAt: new Date(created.createdAt).toISOString(),
      lastUsedAt: null,
      key: created.key,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "body" in error &&
      (error as { body?: { code?: string } }).body?.code === "KEY_LIMIT_REACHED"
    ) {
      throw new KeyLimitError();
    }
    throw error;
  }
}

/** Key-Metadaten des Nutzers, neueste zuerst — nie das Key-Material. */
export async function listKeys(
  db: Db,
  userId: string,
): Promise<ApiKeySummary[]> {
  const docs = await db
    .collection<ApiKeyDoc>(API_KEY_COLLECTION)
    .find(
      { referenceId: userId },
      { projection: { name: 1, start: 1, createdAt: 1, lastRequest: 1 } },
    )
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  return docs.map(toSummary);
}

/** Löscht einen Key, sofern er dem Nutzer gehört. */
export async function revokeKey(
  db: Db,
  userId: string,
  keyId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(keyId)) return false;
  const result = await db
    .collection(API_KEY_COLLECTION)
    .deleteOne({ _id: new ObjectId(keyId), referenceId: userId });
  return result.deletedCount === 1;
}
