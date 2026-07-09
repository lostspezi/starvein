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
