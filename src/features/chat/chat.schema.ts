import { z } from "zod";

export const CHAT_MESSAGE_MAX_LENGTH = 500;

export const chatMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  /** Anzeigename zum Sendezeitpunkt — Snapshot, kein Join beim Lesen. */
  userName: z.string(),
  /** Bereits maskierter Text — der Originaltext wird nie gespeichert. */
  body: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  /** ISO-8601; sortiert lexikographisch = chronologisch, dient als Poll-Cursor. */
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Gelöschte Nachricht im Poll-Protokoll — eigene Zeitachse (deletedAt),
 *  der Client trackt dafür einen zweiten Cursor.
 */
export type ChatDeletion = {
  id: string;
  deletedAt: string;
};

// Liegt hier statt im Service, damit Client-Komponenten die Codes ohne
// Server-Abhängigkeiten (mongodb, node:crypto) importieren können.
export const CHAT_REJECTION_CODES = [
  "empty",
  "tooLong",
  "linkBlocked",
  "excessiveCaps",
  "repeatedChars",
  "duplicate",
] as const;

export type ChatRejectionCode = (typeof CHAT_REJECTION_CODES)[number];
