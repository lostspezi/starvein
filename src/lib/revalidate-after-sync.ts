import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./data-cache";

export type SyncKind = "wiki" | "uex";

/**
 * Invalidiert den Data-Cache nach einem erfolgreichen Sync. Läuft in den
 * Sync-Route-Handlern (POST /api/sync-wiki, /api/sync-uex) — die
 * tsx-Skripte laufen außerhalb der Next-Runtime und können den Cache
 * nicht invalidieren, deshalb muss der Prod-Cron die API-Routen aufrufen.
 * Ein fehlender Cache-Store darf den Sync selbst nie scheitern lassen.
 */
export function revalidateAfterSync(kind: SyncKind): void {
  try {
    revalidateTag(kind === "wiki" ? CACHE_TAGS.wiki : CACHE_TAGS.uex, "max");
  } catch {
    // Außerhalb der Next-Runtime (Tests/Skripte): nichts zu invalidieren
  }
}
