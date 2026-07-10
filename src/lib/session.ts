import { toRole, type Role } from "@/features/moderation/roles";
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
 * Wie getSessionUserId, liefert aber zusätzlich Anzeigename und Rolle —
 * z. B. für den Chat (Name-Snapshot an der Nachricht) und die
 * Moderations-/Admin-Routen (Rollen-Guards).
 */
export async function getSessionUser(
  headers: Headers,
): Promise<{ id: string; name: string; role: Role } | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    role: toRole((session.user as { role?: unknown }).role),
  };
}
