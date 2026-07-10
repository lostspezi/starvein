import type { Db } from "mongodb";
import { z } from "zod";

const COLLECTION = "chatTimeouts";
const NO_ID = { projection: { _id: 0 } } as const;

export const chatTimeoutSchema = z.object({
  userId: z.string(),
  /** Anzeigename fürs Admin-Panel — Snapshot wie bei Chat-Nachrichten. */
  userName: z.string(),
  /** ISO-8601; Ablauf ist passiv über until > now, kein Cleanup-Job. */
  until: z.string(),
  byUserId: z.string(),
  createdAt: z.string(),
});

export type ChatTimeout = z.infer<typeof chatTimeoutSchema>;

const indexedDbs = new Set<string>();

export async function ensureTimeoutIndexes(db: Db): Promise<void> {
  if (indexedDbs.has(db.databaseName)) return;
  await db.collection(COLLECTION).createIndex({ userId: 1 }, { unique: true });
  indexedDbs.add(db.databaseName);
}

/** Ein aktiver Timeout pro User — ein neuer ersetzt den alten. */
export async function upsertChatTimeout(
  db: Db,
  input: { userId: string; userName: string; until: string; byUserId: string },
): Promise<void> {
  await ensureTimeoutIndexes(db);
  const timeout = chatTimeoutSchema.parse({
    ...input,
    createdAt: new Date().toISOString(),
  });
  await db
    .collection(COLLECTION)
    .updateOne({ userId: timeout.userId }, { $set: timeout }, { upsert: true });
}

export async function getActiveChatTimeout(
  db: Db,
  userId: string,
  nowIso: string,
): Promise<ChatTimeout | null> {
  const doc = await db
    .collection(COLLECTION)
    .findOne({ userId, until: { $gt: nowIso } }, NO_ID);
  return doc ? chatTimeoutSchema.parse(doc) : null;
}

export async function listActiveTimeouts(
  db: Db,
  nowIso: string,
): Promise<ChatTimeout[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ until: { $gt: nowIso } }, NO_ID)
    .sort({ until: 1 })
    .toArray();
  return docs.map((doc) => chatTimeoutSchema.parse(doc));
}

export async function revokeChatTimeout(db: Db, userId: string): Promise<void> {
  await db.collection(COLLECTION).deleteOne({ userId });
}
