import type { Db } from "mongodb";
import { chatMessageSchema, type ChatMessage } from "./chat.schema";

const COLLECTION = "chatMessages";
const NO_ID = { projection: { _id: 0 } } as const;

export const CHAT_HISTORY_MAX = 500;

const indexedDbs = new Set<string>();

export async function ensureChatIndexes(db: Db): Promise<void> {
  if (indexedDbs.has(db.databaseName)) return;
  await db.collection(COLLECTION).createIndex({ createdAt: 1 });
  indexedDbs.add(db.databaseName);
}

export async function insertChatMessage(
  db: Db,
  message: ChatMessage,
): Promise<void> {
  await db.collection(COLLECTION).insertOne({ ...message });
}

/** Die neuesten `limit` Nachrichten, aufsteigend sortiert (für die UI). */
export async function listLatestMessages(
  db: Db,
  limit: number,
): Promise<ChatMessage[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({}, NO_ID)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.reverse().map((doc) => chatMessageSchema.parse(doc));
}

/**
 * Nachrichten nach dem Cursor, aufsteigend. Nachrichten mit exakt
 * demselben Zeitstempel wie der Cursor werden übersprungen ($gt) —
 * der Client dedupliziert zusätzlich per id.
 */
export async function listMessagesAfter(
  db: Db,
  after: string,
  limit: number,
): Promise<ChatMessage[]> {
  const docs = await db
    .collection(COLLECTION)
    .find({ createdAt: { $gt: after } }, NO_ID)
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => chatMessageSchema.parse(doc));
}

/** Hält die Historie klein: alles älter als die neuesten `max` fliegt raus. */
export async function capChatHistory(
  db: Db,
  max = CHAT_HISTORY_MAX,
): Promise<void> {
  const cutoffDocs = await db
    .collection(COLLECTION)
    .find({}, { projection: { _id: 0, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .skip(max - 1)
    .limit(1)
    .toArray();
  const cutoff = cutoffDocs[0]?.createdAt;
  if (typeof cutoff !== "string") return;
  await db.collection(COLLECTION).deleteMany({ createdAt: { $lt: cutoff } });
}
