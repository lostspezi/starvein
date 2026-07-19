import { timingSafeEqual } from "node:crypto";

/**
 * Prüft den `x-sync-secret`-Header timing-sicher gegen `SYNC_SECRET`.
 * Fail closed: ohne konfiguriertes `SYNC_SECRET` wird jede Anfrage
 * abgelehnt (CLAUDE.md §6.1). Der Vergleich nutzt `timingSafeEqual`,
 * damit ein Angreifer das Secret nicht zeichenweise über die Antwortzeit
 * rekonstruieren kann.
 */
export function isAuthorizedSyncRequest(request: Request): boolean {
  const configured = process.env.SYNC_SECRET;
  if (!configured) return false;

  const provided = request.headers.get("x-sync-secret");
  if (!provided) return false;

  return safeEqual(provided, configured);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual wirft bei ungleicher Länge — Längen-Guard zuerst.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
