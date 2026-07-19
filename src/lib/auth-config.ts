/**
 * Reine Helfer für die Better-Auth-Konfiguration (in auth.ts verdrahtet).
 * Ausgelagert, damit sie ohne Mongo-Verbindung unit-getestet werden können.
 */

/**
 * Baut die `trustedOrigins`-Liste (CSRF-/Open-Redirect-Schutz, CLAUDE.md §2/§8).
 * Immer enthalten: der Origin von `BETTER_AUTH_URL`. Zusätzlich kommaseparierte
 * Einträge aus `BETTER_AUTH_TRUSTED_ORIGINS` — exakte Origins werden normalisiert,
 * Wildcard-Muster (z. B. `https://*.starvein.app`) unverändert durchgereicht.
 */
export function resolveTrustedOrigins(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const origins = new Set<string>();

  addOrigin(origins, env.BETTER_AUTH_URL);

  for (const raw of (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    addOrigin(origins, raw);
  }

  return [...origins];
}

function addOrigin(set: Set<string>, value: string | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed) return;

  // Wildcard-Muster kann keine URL sein — unverändert übernehmen.
  if (trimmed.includes("*")) {
    set.add(trimmed);
    return;
  }

  try {
    set.add(new URL(trimmed).origin);
  } catch {
    // Kein gültiger Origin/kein URL — ignorieren statt zu crashen.
  }
}
