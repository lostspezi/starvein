import { getDb } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { isDashboardAdminUser } from "./admin-access.service";

/**
 * Server-Guard fürs Admin-Dashboard: liest die Session, prüft die verknüpfte
 * Discord-ID gegen `ADMIN_DISCORD_IDS`. Gibt bei fehlendem Zugriff null zurück
 * (Aufrufer antwortet mit 404/401 — die Seite verrät ihre Existenz nicht).
 * Wiederverwendet von der Dashboard-Seite und dem Nav-Access-Endpoint.
 */
export async function requireDashboardAdmin(
  headers: Headers,
): Promise<{ id: string } | null> {
  const userId = await getSessionUserId(headers);
  if (!userId) return null;

  const db = await getDb();
  const allowed = await isDashboardAdminUser(db, userId);
  return allowed ? { id: userId } : null;
}
