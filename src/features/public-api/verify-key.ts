import { API_KEY_PREFIX } from "@/lib/api-key-plugin";
import { auth } from "@/lib/auth";

/**
 * Liest den API-Key aus `Authorization: Bearer sv_…` (primär) oder
 * `x-api-key` (Komfort für Tools ohne Bearer-Support).
 */
export function extractApiKey(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    return token || null;
  }

  const headerKey = headers.get("x-api-key")?.trim();
  return headerKey || null;
}

export type VerifiedApiKey = { keyId: string; userId: string };

/**
 * Verifiziert den Key über das Better-Auth-Plugin (Hash-Vergleich in der
 * DB). Fast-Fail ohne `sv_`-Prefix, damit Garbage-Keys keinen DB-Hit
 * kosten.
 */
export async function verifyApiKey(
  key: string,
): Promise<VerifiedApiKey | null> {
  if (!key.startsWith(API_KEY_PREFIX)) return null;

  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) return null;
  return { keyId: result.key.id, userId: result.key.referenceId };
}
