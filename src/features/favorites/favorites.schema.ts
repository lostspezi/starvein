import { z } from "zod";

/**
 * Favoriten liegen in einer eigenen Collection (statt als Array am
 * Better-Auth-User-Dokument wie in der CLAUDE.md-Skizze) — eindeutig
 * über (userId, systemCode, bodySlug), einfacher test- und erweiterbar.
 */
export const favoriteSchema = z.object({
  userId: z.string().min(1),
  systemCode: z.string().regex(/^[A-Z]+$/),
  bodySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  createdAt: z.string().min(1),
});

export type Favorite = z.infer<typeof favoriteSchema>;
