import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/** Default: großzügiges Backstop-Limit pro IP und Endpunkt. */
export const DEFAULT_READ_LIMIT = 120;
export const DEFAULT_READ_WINDOW_SECONDS = 60;

/**
 * Ermittelt die Client-IP hinter dem Reverse-Proxy/Cloudflare. Reihenfolge:
 * `cf-connecting-ip` (Cloudflare) → erster Hop von `x-forwarded-for` →
 * `x-real-ip`. Ohne verwertbaren Header `"unknown"` (dann greift das Limit
 * global — bewusst konservativ).
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = headers.get("x-real-ip");
  if (real?.trim()) return real.trim();

  return "unknown";
}

/**
 * Backstop-Rate-Limit für offene, unauthentifizierte Read-Endpunkte. Die
 * primäre Bremse gegen Missbrauch der offenen APIs ist der Edge (Cloudflare
 * Rate-Limiting, siehe docs/DEPLOY.md) — dieser App-Level-Check schützt
 * zusätzlich, falls der Origin direkt (an Cloudflare vorbei) angesprochen
 * wird.
 *
 * Fail-open: Ohne erreichbares Redis blockiert `checkRateLimit` nicht. Das
 * ist eine bewusste Verfügbarkeits-Entscheidung (ein Redis-Ausfall soll die
 * öffentliche Referenz nicht lahmlegen) — in diesem Fall trägt allein der
 * Edge die Bremse.
 *
 * @returns 429-Response bei Überschreitung, sonst `null` (Aufrufer fährt fort).
 */
export async function enforceReadRateLimit(
  request: Request,
  bucket: string,
  limit: number = DEFAULT_READ_LIMIT,
  windowSeconds: number = DEFAULT_READ_WINDOW_SECONDS,
): Promise<NextResponse | null> {
  const ip = clientIp(request.headers);
  const allowed = await checkRateLimit(
    `read:${bucket}:${ip}`,
    limit,
    windowSeconds,
  );
  if (allowed) return null;
  return NextResponse.json({ error: "rate limited" }, { status: 429 });
}
