import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis";

// Fenster, in dem dieselbe (normalisierte) Nachricht desselben Users
// als Duplikat gilt.
const DUPLICATE_WINDOW_SECONDS = 300;

/**
 * Registriert die normalisierte Nachricht in Redis (SET NX EX) und meldet,
 * ob sie im Fenster zum ersten Mal auftaucht. Best effort wie
 * checkRateLimit: ohne konfiguriertes/erreichbares Redis wird nicht
 * blockiert — Chat-Verfügbarkeit hat Vorrang vor Spam-Schutz.
 *
 * Achtung: SET NX registriert den Hash sofort — deshalb im Service als
 * letzten Check vor dem Insert aufrufen, damit eine anderweitig
 * abgelehnte Nachricht kein Duplikat-Fenster startet.
 */
export async function registerAndCheckDuplicate(
  userId: string,
  normalizedBody: string,
): Promise<boolean> {
  if (!process.env.REDIS_URL) return true;

  try {
    const redis = getRedis();
    if (redis.status === "wait" || redis.status === "end") {
      await redis.connect();
    }

    const hash = createHash("sha256").update(normalizedBody).digest("hex");
    const key = `chat:dup:${userId}:${hash}`;
    const result = await redis.set(
      key,
      "1",
      "EX",
      DUPLICATE_WINDOW_SECONDS,
      "NX",
    );
    return result === "OK";
  } catch {
    return true;
  }
}
