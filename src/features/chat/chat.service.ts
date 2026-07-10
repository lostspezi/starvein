import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { maskBadWords } from "./bad-words";
import { registerAndCheckDuplicate } from "./chat.duplicate";
import {
  capChatHistory,
  ensureChatIndexes,
  insertChatMessage,
  listLatestMessages,
  listMessagesAfter,
} from "./chat.repository";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  chatMessageSchema,
  type ChatMessage,
  type ChatRejectionCode,
} from "./chat.schema";
import {
  containsLink,
  hasExcessiveCaps,
  hasRepeatedRun,
  normalizeForDuplicate,
} from "./spam-filter";

/** Fachliche Ablehnung — der Code wird 1:1 als 422-Fehlercode ausgegeben
 *  und clientseitig auf einen i18n-Key gemappt. */
export class ChatValidationError extends Error {
  constructor(public readonly code: ChatRejectionCode) {
    super(code);
  }
}

export type ChatUser = { id: string; name: string };

/**
 * Validierungs-Pipeline fürs Senden: trim → leer → zu lang → Link →
 * Caps → Zeichenwiederholung → Duplikat → böse Wörter maskieren →
 * speichern. Der Duplikat-Check kommt bewusst zuletzt, weil er das
 * Duplikat-Fenster sofort startet (SET NX).
 */
export async function postChatMessage(
  db: Db,
  user: ChatUser,
  rawBody: string,
): Promise<ChatMessage> {
  const body = rawBody.trim();
  if (body.length === 0) throw new ChatValidationError("empty");
  if (body.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new ChatValidationError("tooLong");
  }
  if (containsLink(body)) throw new ChatValidationError("linkBlocked");
  if (hasExcessiveCaps(body)) throw new ChatValidationError("excessiveCaps");
  if (hasRepeatedRun(body)) throw new ChatValidationError("repeatedChars");

  const isFirst = await registerAndCheckDuplicate(
    user.id,
    normalizeForDuplicate(body),
  );
  if (!isFirst) throw new ChatValidationError("duplicate");

  const message = chatMessageSchema.parse({
    id: randomUUID(),
    userId: user.id,
    userName: user.name,
    body: maskBadWords(body),
    createdAt: new Date().toISOString(),
  });

  await ensureChatIndexes(db);
  await insertChatMessage(db, message);
  await capChatHistory(db);

  return message;
}

export async function listChatMessages(
  db: Db,
  after: string | null,
  limit: number,
): Promise<ChatMessage[]> {
  await ensureChatIndexes(db);
  return after
    ? listMessagesAfter(db, after, limit)
    : listLatestMessages(db, limit);
}
