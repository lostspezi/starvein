import { auth } from "@/lib/auth";

/**
 * Liest die Session aus den Request-Headern (Route Handler / Server
 * Components). Gibt null zurück, wenn niemand angemeldet ist.
 */
export async function getSessionUserId(
  headers: Headers,
): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

/**
 * Wie getSessionUserId, liefert aber zusätzlich den Anzeigenamen —
 * z. B. für den Chat, der den Namen als Snapshot an der Nachricht speichert.
 */
export async function getSessionUser(
  headers: Headers,
): Promise<{ id: string; name: string } | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return { id: session.user.id, name: session.user.name };
}
