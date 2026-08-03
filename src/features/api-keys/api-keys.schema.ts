import { z } from "zod";
import { API_KEY_NAME_MAX_LENGTH } from "@/lib/api-key-plugin";

/** Body für POST /api/account/api-keys. */
export const createKeySchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
});

export type CreateKeyInput = z.infer<typeof createKeySchema>;

/** Key-Metadaten für die UI-Liste — niemals das volle Key-Material. */
export type ApiKeySummary = {
  id: string;
  name: string;
  start: string;
  createdAt: string;
  lastUsedAt: string | null;
};

/**
 * Antwort auf das Erstellen: das einzige Mal, dass `key` im Klartext
 * die API verlässt.
 */
export type CreatedApiKey = ApiKeySummary & { key: string };
